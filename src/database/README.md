# Database Module

This module provides database connectivity and ORM functionality using Drizzle ORM with PostgreSQL.

## File Structure

- `drizzle.ts` - Database connection setup and Drizzle ORM instance configuration
  - Exports a PostgreSQL connection pool and a typed Drizzle instance
  - Defines the database schema type for TypeScript type safety

- `database.service.ts` - NestJS service that provides database access
  - Implements `OnModuleDestroy` to properly close database connections
  - Exports the Drizzle instance for use throughout the application

- `database.module.ts` - NestJS module definition
  - Makes the `DatabaseService` available globally throughout the application
  - Ensures a single database connection pool is used across the app

- `schema/` - Database schema definitions
  - `index.ts` - Exports all database tables and types
  - (Add new schema files here as needed)

- `database.service.spec.ts` - Unit tests for the database service

## Drizzle Kit Commands

### Generate Migrations

1. **Create a new migration** (after making schema changes):

   ```bash
   pnpm drizzle-kit generate
   ```

2. **Apply pending migrations**:

   ```bash
   pnpm drizzle-kit migrate
   ```

3. **Generate and run migrations in one command**:

   ```bash
   pnpm drizzle-kit generate && pnpm drizzle-kit migrate
   ```

4. **Introspect the database**:
   ```bash
   pnpm drizzle-kit introspect
   ```

### Environment Variables

Ensure these environment variables are set in your `.env` file:

```
DATABASE_URL=postgres://user:password@localhost:5432/your_database
```

### Best Practices

1. Always introspect using drizzle-kit to ensure you have the latest db updates
2. Always export db models from module and import them into the central schema before you generate migrations
3. Use the `DatabaseService` for database access throughout the application
4. Let Drizzle handle connection pooling - don't create additional pools
