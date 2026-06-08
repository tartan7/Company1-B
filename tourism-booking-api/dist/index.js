import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import * as prometheus from 'prom-client';
import activityRoutes from './routes/activities';
import scheduleRoutes from './routes/schedules';
import authRoutes from './routes/auth';
import auditRoutes from './routes/audit';
import adminRoutes from './routes/admin';
import versionsRoutes from './routes/versions';
import { healthCheck, closeDb } from './db';
config();
const app = express();
const PORT = process.env.PORT || 3000;
// Prometheus metrics setup
const httpRequestDuration = new prometheus.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5]
});
const httpRequestTotal = new prometheus.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code']
});
const httpRequestErrors = new prometheus.Counter({
    name: 'http_request_errors_total',
    help: 'Total number of HTTP request errors',
    labelNames: ['method', 'route', 'status_code']
});
// Middleware
app.use(cors());
app.use(express.json());
// Metrics middleware
app.use((req, res, next) => {
    const start = Date.now();
    const route = req.route?.path || req.path;
    const originalSend = res.send;
    res.send = function (data) {
        const duration = (Date.now() - start) / 1000;
        const statusCode = res.statusCode;
        httpRequestDuration.labels(req.method, route, statusCode.toString()).observe(duration);
        httpRequestTotal.labels(req.method, route, statusCode.toString()).inc();
        if (statusCode >= 400) {
            httpRequestErrors.labels(req.method, route, statusCode.toString()).inc();
        }
        return originalSend.call(this, data);
    };
    next();
});
// Health check
app.get('/health', async (req, res) => {
    const dbHealthy = await healthCheck();
    res.json({ status: 'ok', database: dbHealthy ? 'connected' : 'disconnected' });
});
// Metrics endpoint
app.get('/metrics', (req, res) => {
    res.set('Content-Type', prometheus.register.contentType);
    res.end(prometheus.register.metrics());
});
// Auth routes
app.use('/auth', authRoutes);
// Activity routes
app.use('/api/v1/activities', activityRoutes);
// Schedule routes
app.use('/api/v1/schedules', scheduleRoutes);
// Audit routes
app.use('/api/v1/audit', auditRoutes);
// Versioning routes (generic for all resource types)
app.use('/api/v1', versionsRoutes);
// Admin routes
app.use('/admin', adminRoutes);
const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(async () => {
        await closeDb();
        process.exit(0);
    });
});
process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully');
    server.close(async () => {
        await closeDb();
        process.exit(0);
    });
});
