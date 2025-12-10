// src/database/drizzle.ts
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

// Define database schema type
export type DatabaseSchema = typeof schema;

// Single global pool for both Drizzle Kit and NestJS
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl: {
    rejectUnauthorized: false, // necessary for Supabase SSL connections
  },
});

// Drizzle ORM instance (exported for CLI/migrations)
export const db: NodePgDatabase<DatabaseSchema> = drizzle(pool, {
  schema,
});
