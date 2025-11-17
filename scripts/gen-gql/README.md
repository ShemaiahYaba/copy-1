# GradLinq GraphQL Generator

This script automates the generation of NestJS GraphQL entity and DTO classes from Drizzle ORM schema definitions.

## Features

- Generates `@ObjectType` entity classes from Drizzle table schemas
- Creates corresponding `@InputType` DTOs for create and update operations
- Handles TypeScript types and GraphQL scalar mappings
- Supports common database types (String, Int, Float, Boolean, Date, JSON)
- Preserves nullability constraints from database schema

## Prerequisites

- Node.js
- TypeScript
- Drizzle ORM schemas in your project
- `@nestjs/graphql` and `graphql-scalars` packages installed

## Usage

```bash
# Generate GraphQL types for a specific module
npx ts-node scripts/gen-gql.ts <module-name>
```

### Example

```bash
# Generate types for the 'user' module
npx ts-node scripts/gen-gql.ts user
```

## File Structure

The script expects the following directory structure:

```
src/
  modules/
    <module-name>/
      models/         # Drizzle table schemas
      entities/       # Generated GraphQL entity classes
      dto/            # Generated DTO classes
```

## How It Works

1. Looks for Drizzle table definitions in `src/modules/<module-name>/models/`
2. For each table, generates:
   - An entity class in `entities/`
   - A create DTO in `dto/`
   - An update DTO in `dto/`
3. Handles:
   - Primary keys (mapped to GraphQL ID)
   - Nullable fields
   - Default values
   - Auto-generated fields (like auto-incrementing IDs)

## Notes

- The script preserves the original field names from your Drizzle schema
- All generated files are TypeScript files with proper type annotations
- You may need to manually add relationships between entities
- The script will not overwrite existing files - delete them first if you want to regenerate

## Dependencies

- `@nestjs/graphql`
- `graphql-scalars` (for custom scalar types like DateTime and JSON)
- `typescript`
- `ts-node` (for running the script)