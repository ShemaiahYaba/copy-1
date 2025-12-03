# GradLinq GraphQL Generator

Automate the generation of NestJS GraphQL entity and DTO classes from Drizzle ORM schema definitions. This script saves you time by automatically creating type-safe GraphQL types that match your database schema.

## Features

- ✨ Generates `@ObjectType` entity classes from Drizzle table schemas
- 🔄 Creates corresponding `@InputType` DTOs for create and update operations
- 🎯 Handles TypeScript types and GraphQL scalar mappings automatically
- 📦 Supports nested module paths (e.g., `admin/users`, `core/auth/providers`)
- 🔍 Smart field detection (primary keys, nullable fields, defaults, auto-generated fields)
- 📊 Supports common database types:
  - String, Int, Float, Boolean
  - Date/DateTime (via GraphQL scalars)
  - JSON (via GraphQL scalars)
  - UUID
- ⚡ Preserves nullability constraints from database schema
- 🛡️ Auto-excludes auto-generated fields from create DTOs

## Prerequisites

Before using this script, ensure you have:

- Node.js installed
- TypeScript configured in your project
- Drizzle ORM schemas defined
- Required packages:
  ```bash
  npm install @nestjs/graphql graphql-scalars
  npm install -D ts-node glob @types/glob
  ```

## Usage

### Basic Syntax

```bash
npx ts-node scripts/gen-gql.ts <module-path>
```

### Examples

```bash
# Simple module
npx ts-node scripts/gen-gql.ts user

# Nested module (one level)
npx ts-node scripts/gen-gql.ts admin/users

# Deeply nested module
npx ts-node scripts/gen-gql.ts core/auth/providers

# Another example
npx ts-node scripts/gen-gql.ts marketplace/products
```

## Project Structure

The script expects and generates files in the following structure:

```
src/
  modules/
    <module-path>/          # Can be nested (e.g., admin/users)
      models/               # Your Drizzle table schemas go here
        user.model.ts
        profile.model.ts
      entities/             # Generated GraphQL entity classes
        user.entity.ts
        profile.entity.ts
      dto/                  # Generated DTO classes
        create-user.input.ts
        update-user.input.ts
        create-profile.input.ts
        update-profile.input.ts
```

### Example Input (Drizzle Schema)

```typescript
// src/modules/user/models/user.model.ts
import {
  pgTable,
  serial,
  varchar,
  timestamp,
  boolean,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull(),
  username: varchar('username', { length: 50 }).notNull(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at'),
});
```

### Example Output

**Generated Entity (`entities/user.entity.ts`):**

```typescript
import { ObjectType, Field, Int, ID } from '@nestjs/graphql';
import { GraphQLDateTime } from 'graphql-scalars';

@ObjectType()
export class UserEntity {
  @Field(() => ID)
  id: number;

  @Field(() => String)
  email: string;

  @Field(() => String)
  username: string;

  @Field(() => Boolean, { nullable: true })
  isActive: boolean | null;

  @Field(() => GraphQLDateTime, { nullable: true })
  createdAt: Date | null;

  @Field(() => GraphQLDateTime, { nullable: true })
  updatedAt: Date | null;
}
```

**Generated Create DTO (`dto/create-user.input.ts`):**

```typescript
import { InputType, Field, Int } from '@nestjs/graphql';

@InputType()
export class CreateUserInput {
  @Field(() => String)
  email: string;

  @Field(() => String)
  username: string;

  @Field(() => GraphQLDateTime, { nullable: true })
  updatedAt?: Date | null;
}
```

**Generated Update DTO (`dto/update-user.input.ts`):**

```typescript
import { InputType, Field, Int, ID, PartialType } from '@nestjs/graphql';
import { CreateUserInput } from './create-user.input';

@InputType()
export class UpdateUserInput extends PartialType(CreateUserInput) {
  @Field(() => ID)
  id: number;
}
```

## How It Works

The script follows these steps:

1. 🔍 **Scans** for Drizzle table definitions in `src/modules/<module-path>/models/`
2. 🔎 **Analyzes** each table to extract:
   - Column names and types
   - Nullability constraints
   - Primary keys
   - Default values
   - Auto-generated fields
3. ✨ **Generates** three files per table:
   - **Entity class** in `entities/` with `@ObjectType` decorator
   - **Create DTO** in `dto/` with `@InputType` decorator (excludes auto-generated fields)
   - **Update DTO** in `dto/` with `@InputType` decorator (extends create DTO as partial)
4. 📝 **Maps** SQL types to appropriate GraphQL types and TypeScript types

## Type Mappings

| SQL Type                      | GraphQL Type      | TypeScript Type |
| ----------------------------- | ----------------- | --------------- |
| `int`, `bigint`, `serial`     | `Int`             | `number`        |
| `varchar`, `text`, `char`     | `String`          | `string`        |
| `uuid`                        | `String`          | `string`        |
| `decimal`, `numeric`, `float` | `Float`           | `number`        |
| `boolean`                     | `Boolean`         | `boolean`       |
| `timestamp`, `date`, `time`   | `GraphQLDateTime` | `Date`          |
| `json`, `jsonb`               | `GraphQLJSON`     | `any`           |

## Smart Field Handling

### Create DTO

The script **automatically excludes** from create inputs:

- Primary key fields (usually auto-generated)
- Fields with `serial` or auto-increment types
- Fields with default values in the database

### Update DTO

- Extends the create DTO as a partial type (all fields optional)
- Always includes the primary key as a required field for identification

## Working with Nested Modules

The script fully supports nested module structures:

```bash
# Before (flat structure)
src/modules/user/
src/modules/adminUser/
src/modules/marketplaceProduct/

# After (nested structure)
src/modules/user/
src/modules/admin/user/
src/modules/marketplace/product/

# Usage
npx ts-node scripts/gen-gql.ts admin/user
npx ts-node scripts/gen-gql.ts marketplace/product
```

## Tips and Best Practices

1. **Naming Convention**: Use snake_case or camelCase for table names. The script converts them to PascalCase for class names.

2. **Relationships**: The script generates basic types. You'll need to manually add relationship fields:

   ```typescript
   @Field(() => [PostEntity])
   posts: PostEntity[];
   ```

3. **Custom Scalars**: For custom types not handled by the script, you may need to adjust the generated files.

4. **Regeneration**: The script doesn't overwrite existing files by default. Delete files if you want to regenerate them.

5. **Validation**: Add validation decorators from `class-validator` to your DTOs after generation:
   ```typescript
   @IsEmail()
   @Field(() => String)
   email: string;
   ```

## Troubleshooting

### "Models folder not found"

- Ensure you're running the script from your project root
- Verify the module path is correct
- Check that the `models/` directory exists in your module

### "No Drizzle tables found"

- Ensure your tables are exported from the model files
- Verify you're using Drizzle ORM's table definition functions

### "No columns detected"

- Check that your table definition includes column definitions
- Ensure you're using supported Drizzle column types

## Contributing

Feel free to extend this script to support:

- Additional database types
- Custom field transformations
- Relationship auto-detection
- Custom decorators

## License

Part of the GradLinq project.
