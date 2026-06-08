import { Request, Response, NextFunction } from 'express';
import * as prometheus from 'prom-client';

// Create metrics
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

const dbQueryDuration = new prometheus.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2]
});

const dbConnections = new prometheus.Gauge({
  name: 'db_connections_active',
  help: 'Number of active database connections',
  labelNames: ['pool']
});

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const route = req.route?.path || req.path;

  // Capture the original send method
  const originalSend = res.send;

  // Override send to capture response metrics
  res.send = function (data: any) {
    const duration = (Date.now() - start) / 1000;
    const statusCode = res.statusCode;

    httpRequestDuration
      .labels(req.method, route, statusCode.toString())
      .observe(duration);

    httpRequestTotal
      .labels(req.method, route, statusCode.toString())
      .inc();

    if (statusCode >= 400) {
      httpRequestErrors
        .labels(req.method, route, statusCode.toString())
        .inc();
    }

    // Call the original send
    return originalSend.call(this, data);
  };

  next();
}

export function metricsEndpoint(req: Request, res: Response) {
  res.set('Content-Type', prometheus.register.contentType);
  res.end(prometheus.register.metrics());
}

export function recordDbQuery(operation: string, table: string, durationMs: number) {
  dbQueryDuration
    .labels(operation, table)
    .observe(durationMs / 1000);
}

export function setActiveConnections(pool: string, count: number) {
  dbConnections.labels(pool).set(count);
}

export function getMetrics() {
  return {
    httpRequestDuration,
    httpRequestTotal,
    httpRequestErrors,
    dbQueryDuration,
    dbConnections
  };
}
