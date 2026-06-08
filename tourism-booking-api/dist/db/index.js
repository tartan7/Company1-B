import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
// Initialize connection pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/tourism_booking',
    max: 20, // Max connections in pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});
pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
});
// Initialize Drizzle ORM
export const db = drizzle(pool, { schema });
// Transaction helper for atomic operations
export async function withTransaction(callback) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const tx = drizzle(client, { schema });
        const result = await callback(tx);
        await client.query('COMMIT');
        return result;
    }
    catch (error) {
        await client.query('ROLLBACK');
        throw error;
    }
    finally {
        client.release();
    }
}
// Direct client access for raw SQL operations (e.g., SELECT...FOR UPDATE)
export async function getClient() {
    return pool.connect();
}
// Health check
export async function healthCheck() {
    try {
        const client = await pool.connect();
        await client.query('SELECT 1');
        client.release();
        return true;
    }
    catch (error) {
        console.error('Database health check failed:', error);
        return false;
    }
}
// Graceful shutdown
export async function closeDb() {
    await pool.end();
}
