// src/database/database.service.ts
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { db, pool, type DatabaseSchema } from './drizzle';
import { type NodePgDatabase } from 'drizzle-orm/node-postgres';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  db: NodePgDatabase<DatabaseSchema> = db;

  async onModuleDestroy() {
    await pool.end();
  }
}
