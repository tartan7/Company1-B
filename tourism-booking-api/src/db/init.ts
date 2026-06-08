import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

// Run database migrations from SQL files
export async function runMigrations(databaseUrl: string): Promise<void> {
  const pool = new Pool({ connectionString: databaseUrl });

  try {
    // Create migrations_history table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Migrations tracking table ready');

    const migrationDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationDir)
      .filter(f => f.endsWith('.sql') && f !== '.gitkeep')
      .sort();

    if (files.length === 0) {
      console.log('No migrations found');
      return;
    }

    for (const file of files) {
      // Check if migration has already been executed
      const result = await pool.query(
        'SELECT * FROM _migrations WHERE name = $1',
        [file]
      );

      if (result.rows.length > 0) {
        console.log(`⊘ Skipped (already executed): ${file}`);
        continue;
      }

      const filePath = path.join(migrationDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      console.log(`→ Running migration: ${file}`);

      // Split SQL by statement-breakpoint comments from drizzle
      const statements = sql
        .split('--> statement-breakpoint')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      for (const statement of statements) {
        await pool.query(statement);
      }

      // Record migration as executed
      await pool.query(
        'INSERT INTO _migrations (name) VALUES ($1)',
        [file]
      );

      console.log(`✓ Completed: ${file}`);
    }

    console.log('✓ All migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Initialize database for development
export async function initDatabase(): Promise<void> {
  const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/tourism_booking';

  try {
    // Create database if it doesn't exist
    const adminPool = new Pool({
      connectionString: 'postgresql://postgres:postgres@localhost:5432',
    });

    try {
      await adminPool.query('CREATE DATABASE tourism_booking;');
      console.log('✓ Created database');
    } catch (error: any) {
      if (error.code === '42P04' || error.message?.includes('already exists')) {
        console.log('✓ Database already exists');
      } else {
        throw error;
      }
    } finally {
      await adminPool.end();
    }

    // Run migrations
    await runMigrations(dbUrl);
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

// Only run if executed directly
if (require.main === module) {
  initDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
