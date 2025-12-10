# Import/Export Models This Way

The current setup in `schema/index.ts` is a common pattern used with Drizzle ORM to:

1. Centralize all your table schemas in one place
2. Ensure all models are registered before generating migrations
3. Make it easier to reference tables across your application

## How to Properly Structure Imports/Exports

Here's how to improve your current setup:

1. **Central Schema File**:

   ```typescript
   // Import all your models
   import {
     test,
     anotherTest,
     aThirdTest,
     aFourthTest,
   } from '../../modules/test/models';
   import { anotherTest1 } from '../../modules/test1/models';

   // Export all models
   export { test, anotherTest, aThirdTest, aFourthTest, anotherTest1 };
   ```

2. **Model File Example**:

   ```typescript
   // src/modules/test/models/test.models.ts
   import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

   export const test = pgTable('test', {
     id: serial('id').primaryKey(),
     name: text('name').notNull(),
     createdAt: timestamp('created_at').defaultNow().notNull(),
   });
   ```

## Why This Works for Migrations

1. **Drizzle CLI** looks for a default export or specific exports in your schema file
2. By importing and re-exporting all models in `schema/index.ts`, you ensure:
   - All tables are registered with Drizzle
   - The migration generator can see all your tables and their relations
   - You have a single source of truth for your database schema

This pattern keeps your database schema well-organized and ensures all models are properly registered before Drizzle generates migrations.
