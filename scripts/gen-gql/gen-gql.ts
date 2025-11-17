#!/usr/bin/env ts-node

/**
 * GradLinq GraphQL Generator
 * -----------------------------------------
 * Usage:
 *    npx ts-node scripts/gen-gql.ts test1
 *
 * Reads drizzle schemas in /models, generates GraphQL @ObjectType
 * classes into /entities AND @InputType DTOs into /dto for that module.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';

const moduleName = process.argv[2];
if (!moduleName) {
  console.error(
    '❌ Please provide a module name. Example: npx ts-node scripts/gen-gql.ts user',
  );
  process.exit(1);
}

const projectRoot = process.cwd();
const modulePath = path.join(projectRoot, `src/modules/${moduleName}`);
const modelsDir = path.join(modulePath, 'models');
const entitiesDir = path.join(modulePath, 'entities');
const dtoDir = path.join(modulePath, 'dto');

if (!fs.existsSync(modelsDir)) {
  console.error(`❌ Models folder not found: ${modelsDir}`);
  process.exit(1);
}

if (!fs.existsSync(entitiesDir)) {
  fs.mkdirSync(entitiesDir, { recursive: true });
}

if (!fs.existsSync(dtoDir)) {
  fs.mkdirSync(dtoDir, { recursive: true });
}

function toClassName(name: string) {
  // Convert snake_case or camelCase to PascalCase
  return name
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

function toKebabCase(name: string) {
  return name
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

interface ColumnInfo {
  sqlType: string;
  isNotNull: boolean;
  isPrimaryKey: boolean;
  hasDefault: boolean;
  isGenerated: boolean;
}

function getColumnInfo(col: any): ColumnInfo {
  // Access Drizzle's internal column configuration
  const columnConfig = col;

  // Get SQL data type
  let sqlType = 'varchar';
  if (columnConfig.getSQLType) {
    sqlType = columnConfig.getSQLType();
  } else if (columnConfig.dataType) {
    sqlType = columnConfig.dataType;
  }

  // Check if column is NOT NULL
  const isNotNull = columnConfig.notNull === true;

  // Check if primary key
  const isPrimaryKey = columnConfig.primary === true;

  // Check if has default value
  const hasDefault =
    columnConfig.hasDefault === true || columnConfig.default !== undefined;

  // Check if auto-generated (serial, identity, etc.)
  const isGenerated =
    columnConfig.generated !== undefined ||
    sqlType.toLowerCase().includes('serial') ||
    columnConfig.generatedIdentity !== undefined;

  return { sqlType, isNotNull, isPrimaryKey, hasDefault, isGenerated };
}

function sqlToGraphQLType(sqlType: string): {
  gqlType: string;
  tsType: string;
} {
  const type = sqlType.toLowerCase();

  if (
    type.includes('bigint') ||
    type.includes('int') ||
    type.includes('serial')
  ) {
    return { gqlType: 'Int', tsType: 'number' };
  }
  if (
    type.includes('varchar') ||
    type.includes('text') ||
    type.includes('char')
  ) {
    return { gqlType: 'String', tsType: 'string' };
  }
  if (type.includes('uuid')) {
    return { gqlType: 'String', tsType: 'string' };
  }
  if (
    type.includes('decimal') ||
    type.includes('numeric') ||
    type.includes('float') ||
    type.includes('double') ||
    type.includes('real')
  ) {
    return { gqlType: 'Float', tsType: 'number' };
  }
  if (type.includes('bool')) {
    return { gqlType: 'Boolean', tsType: 'boolean' };
  }
  if (
    type.includes('timestamp') ||
    type.includes('date') ||
    type.includes('time')
  ) {
    return { gqlType: 'Date', tsType: 'Date' };
  }
  if (type.includes('json')) {
    return { gqlType: 'JSON', tsType: 'any' };
  }

  // Default to String
  return { gqlType: 'String', tsType: 'string' };
}

function generateEntity(
  entityName: string,
  columns: Record<string, any>,
): string {
  const fields: string[] = [];
  const imports = new Set<string>(['ObjectType', 'Field', 'Int']);

  for (const [key, col] of Object.entries(columns)) {
    const { sqlType, isNotNull, isPrimaryKey } = getColumnInfo(col);
    const { gqlType, tsType } = sqlToGraphQLType(sqlType);

    const isNullable = !isNotNull;

    const decoratorOptions = [];
    if (isNullable) {
      decoratorOptions.push('nullable: true');
    }

    if (isPrimaryKey) {
      imports.add('ID');
      const decorator =
        decoratorOptions.length > 0
          ? `@Field(() => ID, { ${decoratorOptions.join(', ')} })`
          : `@Field(() => ID)`;
      fields.push(
        `  ${decorator}\n  ${key}: ${tsType}${isNullable ? ' | null' : ''};`,
      );
    } else {
      if (gqlType === 'Date') {
        imports.add('GraphQLDateTime');
      }
      if (gqlType === 'JSON') {
        imports.add('GraphQLJSON');
      }

      const typeRef =
        gqlType === 'Date'
          ? 'GraphQLDateTime'
          : gqlType === 'JSON'
            ? 'GraphQLJSON'
            : gqlType;

      const decorator =
        decoratorOptions.length > 0
          ? `@Field(() => ${typeRef}, { ${decoratorOptions.join(', ')} })`
          : `@Field(() => ${typeRef})`;
      fields.push(
        `  ${decorator}\n  ${key}: ${tsType}${isNullable ? ' | null' : ''};`,
      );
    }
  }

  // Build imports
  const nestImports = Array.from(imports).filter(
    (i) => !['GraphQLDateTime', 'GraphQLJSON'].includes(i),
  );
  const scalarImports = Array.from(imports).filter((i) =>
    ['GraphQLDateTime', 'GraphQLJSON'].includes(i),
  );

  let importStatements = `import { ${nestImports.join(', ')} } from '@nestjs/graphql';`;
  if (scalarImports.length > 0) {
    importStatements += `\nimport { ${scalarImports.join(', ')} } from 'graphql-scalars';`;
  }

  return `${importStatements}

@ObjectType()
export class ${entityName}Entity {
${fields.join('\n\n')}
}
`;
}

function generateCreateDTO(
  entityName: string,
  columns: Record<string, any>,
): string {
  const fields: string[] = [];
  const imports = new Set<string>(['InputType', 'Field', 'Int']);

  for (const [key, col] of Object.entries(columns)) {
    const { sqlType, isNotNull, isPrimaryKey, hasDefault, isGenerated } =
      getColumnInfo(col);

    // Skip fields that shouldn't be in create input
    if (isPrimaryKey || isGenerated || hasDefault) {
      continue; // Auto-generated fields or fields with defaults
    }

    const { gqlType, tsType } = sqlToGraphQLType(sqlType);

    // In create DTO, fields without defaults should match their DB constraint
    const isOptional = !isNotNull || hasDefault;

    const decoratorOptions = [];
    if (isOptional) {
      decoratorOptions.push('nullable: true');
    }

    if (gqlType === 'Date') {
      imports.add('GraphQLDateTime');
    }
    if (gqlType === 'JSON') {
      imports.add('GraphQLJSON');
    }

    const typeRef =
      gqlType === 'Date'
        ? 'GraphQLDateTime'
        : gqlType === 'JSON'
          ? 'GraphQLJSON'
          : gqlType;

    const decorator =
      decoratorOptions.length > 0
        ? `@Field(() => ${typeRef}, { ${decoratorOptions.join(', ')} })`
        : `@Field(() => ${typeRef})`;
    fields.push(
      `  ${decorator}\n  ${key}${isOptional ? '?' : ''}: ${tsType}${isOptional ? ' | null' : ''};`,
    );
  }

  // Build imports
  const nestImports = Array.from(imports).filter(
    (i) => !['GraphQLDateTime', 'GraphQLJSON'].includes(i),
  );
  const scalarImports = Array.from(imports).filter((i) =>
    ['GraphQLDateTime', 'GraphQLJSON'].includes(i),
  );

  let importStatements = `import { ${nestImports.join(', ')} } from '@nestjs/graphql';`;
  if (scalarImports.length > 0) {
    importStatements += `\nimport { ${scalarImports.join(', ')} } from 'graphql-scalars';`;
  }

  return `${importStatements}

@InputType()
export class Create${entityName}Input {
${fields.length > 0 ? fields.join('\n\n') : '  // No fields needed - all fields are auto-generated or have defaults'}
}
`;
}

function generateUpdateDTO(
  entityName: string,
  columns: Record<string, any>,
): string {
  const fields: string[] = [];
  const imports = new Set<string>([
    'InputType',
    'Field',
    'Int',
    'ID',
    'PartialType',
  ]);
  let hasPrimaryKey = false;

  for (const [key, col] of Object.entries(columns)) {
    const { isPrimaryKey } = getColumnInfo(col);

    if (isPrimaryKey) {
      hasPrimaryKey = true;
      // Include primary key as required field for update
      fields.push(`  @Field(() => ID)\n  ${key}: number;`);
      break;
    }
  }

  // Build imports
  const nestImports = Array.from(imports).filter(
    (i) => !['GraphQLISODateTime', 'GraphQLJSON'].includes(i),
  );

  let importStatements = `import { ${nestImports.join(', ')} } from '@nestjs/graphql';`;
  importStatements += `\nimport { Create${entityName}Input } from './create-${toKebabCase(entityName)}.input';`;

  return `${importStatements}

@InputType()
export class Update${entityName}Input extends PartialType(Create${entityName}Input) {
${hasPrimaryKey ? fields.join('\n\n') : '  @Field(() => ID)\n  id: number;'}
}
`;
}

async function processModel(file: string) {
  console.log(`\n📄 Processing file: ${file}`);

  const fileUrl = new URL(`file://${path.resolve(file)}`);
  const modelModule = await import(fileUrl.toString());

  let foundTables = 0;

  for (const [exportName, table] of Object.entries(modelModule)) {
    if (!table || typeof table !== 'object') continue;

    // Check if this looks like a Drizzle table
    const tableSymbols = Object.getOwnPropertySymbols(table);
    const hasTableSymbol = tableSymbols.some(
      (sym) =>
        sym.toString().includes('drizzle') || sym.toString().includes('Table'),
    );

    const looksLikeDrizzleTable =
      (table as any)[Symbol.for('drizzle:Name')] !== undefined ||
      (table as any)[Symbol.for('drizzle:Table')] !== undefined ||
      Object.keys(table).some(
        (key) =>
          (table as any)[key]?.name !== undefined &&
          (table as any)[key]?.getSQLType !== undefined,
      );

    if (!hasTableSymbol && !looksLikeDrizzleTable) continue;

    foundTables++;
    console.log(`\n🔍 Found table: ${exportName}`);

    const entityName = toClassName(exportName);

    // Extract columns
    const columns: Record<string, any> = {};
    const tableObj = table as Record<string, any>;

    for (const [key, value] of Object.entries(tableObj)) {
      if (
        value &&
        typeof value === 'object' &&
        (value.getSQLType !== undefined || value.dataType !== undefined)
      ) {
        columns[key] = value;
      }
    }

    console.log(`   Columns found: ${Object.keys(columns).length}`);

    if (Object.keys(columns).length === 0) {
      console.warn(`   ⚠️ No columns detected for ${exportName}`);
      continue;
    }

    // Log column details
    for (const [key, col] of Object.entries(columns)) {
      const { sqlType, isNotNull, isPrimaryKey, hasDefault, isGenerated } =
        getColumnInfo(col);
      console.log(
        `   ✓ ${key}: ${sqlType} (PK: ${isPrimaryKey}, NotNull: ${isNotNull}, Default: ${hasDefault}, Generated: ${isGenerated})`,
      );
    }

    // Generate Entity
    const entityContent = generateEntity(entityName, columns);
    const entityFile = path.join(
      entitiesDir,
      `${toKebabCase(entityName)}.entity.ts`,
    );
    fs.writeFileSync(entityFile, entityContent);
    console.log(`\n✅ Generated Entity → ${entityFile}`);

    // Generate Create DTO
    const createDtoContent = generateCreateDTO(entityName, columns);
    const createDtoFile = path.join(
      dtoDir,
      `create-${toKebabCase(entityName)}.input.ts`,
    );
    fs.writeFileSync(createDtoFile, createDtoContent);
    console.log(`✅ Generated Create DTO → ${createDtoFile}`);

    // Generate Update DTO
    const updateDtoContent = generateUpdateDTO(entityName, columns);
    const updateDtoFile = path.join(
      dtoDir,
      `update-${toKebabCase(entityName)}.input.ts`,
    );
    fs.writeFileSync(updateDtoFile, updateDtoContent);
    console.log(`✅ Generated Update DTO → ${updateDtoFile}`);
  }

  if (foundTables === 0) {
    console.warn(`   ⚠️ No Drizzle tables found in ${file}`);
  }
}

async function run() {
  const modelFiles = glob.sync(`${modelsDir}/**/*.ts`);
  if (modelFiles.length === 0) {
    console.warn(`⚠️ No model files found in ${modelsDir}`);
    return;
  }

  console.log(`📦 Found ${modelFiles.length} model file(s)`);

  for (const file of modelFiles) {
    await processModel(file);
  }

  console.log(
    `\n🎉 Done generating GraphQL entities and DTOs for module: ${moduleName}`,
  );
}

run().catch(console.error);
