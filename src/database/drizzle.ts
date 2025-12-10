// src/database/drizzle.ts
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import * as dotenv from 'dotenv';

// ✅ CRITICAL FIX: Load .env file BEFORE accessing process.env
dotenv.config();

// Define database schema type
export type DatabaseSchema = typeof schema;

// ✅ VALIDATION: Throw error if DATABASE_URL is not set
if (!process.env.DATABASE_URL) {
  throw new Error(
    '❌ DATABASE_URL environment variable is not set. Please check your .env file.',
  );
}

// Single global pool for both Drizzle Kit and NestJS
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // necessary for Supabase SSL connections
  },
  // ✅ ADDED: Connection pool settings for better reliability
  max: 20, // maximum number of clients in the pool
  idleTimeoutMillis: 30000, // close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // return error after 10 seconds if connection fails
});

// Drizzle ORM instance (exported for CLI/migrations)
export const db: NodePgDatabase<DatabaseSchema> = drizzle(pool, {
  schema,
  logger: process.env.NODE_ENV === 'development', // Enable query logging in dev
});
