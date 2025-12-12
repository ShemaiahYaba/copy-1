# Database Module

Production-ready database layer using Drizzle ORM with PostgreSQL. Provides type-safe queries, automatic migrations, and a clean service pattern for database operations.

## 📋 Table of Contents

- [✨ Features](#-features)
- [🏗️ Architecture](#️-architecture)
- [📦 Installation](#-installation)
- [🚀 Quick Start](#-quick-start)
- [📐 Schema Design](#-schema-design)
- [🔄 Migrations](#-migrations)
- [💡 Usage Examples](#-usage-examples)
- [🔗 Relationships](#-relationships)
- [🔒 Transactions](#-transactions)
- [🧪 Testing](#-testing)
- [⚙️ Configuration](#️-configuration)
- [🛠️ Best Practices](#️-best-practices)
- [🐛 Troubleshooting](#-troubleshooting)

---

## ✨ Features

- **Type-Safe Queries** - Full TypeScript support with Drizzle ORM
- **Automatic Migrations** - Generate and run migrations with a single command
- **Connection Pooling** - Built-in connection pool management
- **Transaction Support** - Easy-to-use transaction API
- **Global Module** - Available throughout your application
- **Schema Validation** - Runtime validation with Drizzle
- **PostgreSQL + Supabase** - Optimized for Supabase but works with any PostgreSQL
- **Zero Configuration** - Works out of the box with sensible defaults

---

## 🏗️ Architecture

### Directory Structure

```markdown
database/
├── drizzle.ts # Connection & ORM configuration
├── database.service.ts # Injectable service
├── database.module.ts # Global module
├── migrations/ # Auto-generated migrations
│ └── 0000\__.sql
└── schema/
├── index.ts # Central schema export
├── README.md # Schema guidelines
└── [module]/ # Module-specific schemas
└── models/
└── _.model.ts # Table definitions
```

### Key Components

1. **drizzle.ts** - Database connection and ORM instance
2. **database.service.ts** - NestJS service wrapper
3. **database.module.ts** - Global module registration
4. **schema/index.ts** - Central export point for all schemas

### Architecture Diagram

```markdown
┌─────────────────────────────────────────────┐
│ NestJS Application │
├─────────────────────────────────────────────┤
│ │
│ ┌──────────────┐ ┌──────────────┐ │
│ │ Controllers │─────▶│ Services │ │
│ └──────────────┘ └──────┬───────┘ │
│ │ │
│ ▼ │
│ ┌────────────────────┐ │
│ │ DatabaseService │ │
│ │ (Injectable) │ │
│ └─────────┬──────────┘ │
│ │ │
│ ▼ │
│ ┌────────────────────┐ │
│ │ Drizzle ORM │ │
│ │ (Type-Safe) │ │
│ └─────────┬──────────┘ │
│ │ │
└──────────────────────────────┼─────────────┘
│
▼
┌────────────────────┐
│ PostgreSQL │
│ (Supabase) │
└────────────────────┘
```

---

## 📦 Installation

### Required Dependencies

```bash
# Using pnpm (recommended)
pnpm add drizzle-orm pg dotenv

# Using npm
npm install drizzle-orm pg dotenv

# Using yarn
yarn add drizzle-orm pg dotenv
```

### Development Dependencies

```bash
# Using pnpm
pnpm add -D drizzle-kit @types/pg

# Using npm
npm install -D drizzle-kit @types/pg

# Using yarn
yarn add -D drizzle-kit @types/pg
```

### Environment Variables

Create or update your `.env` file:

```bash
# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/database_name

# For Supabase (recommended)
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
```

**Supabase Connection String Format:**

```postgresql
postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

Find your connection string:

1. Go to Supabase Dashboard
2. Click on "Settings" → "Database"
3. Copy the "Connection string" under "Connection pooling"

---

## 🚀 Quick Start

### 1. Module is Already Set Up

The Database Module is globally available - no need to import it in feature modules:

```typescript
// src/app.module.ts - Already configured
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [
    DatabaseModule, // ✅ Global module - available everywhere
    // Your other modules...
  ],
})
export class AppModule {}
```

### 2. Use in Services

Simply inject `DatabaseService` anywhere:

```typescript
import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@database/database.service';
import { users } from '@database/schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class UserService {
  constructor(private readonly db: DatabaseService) {}

  async findAll() {
    return this.db.db.select().from(users);
  }

  async findOne(id: string) {
    const [user] = await this.db.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    return user;
  }

  async create(data: NewUser) {
    const [user] = await this.db.db.insert(users).values(data).returning();

    return user;
  }
}
```

### 3. Run Your First Query

```bash
# Start your application
pnpm start:dev

# The DatabaseService will automatically connect to your database
```

---

## 📐 Schema Design

### Creating a New Schema

#### Step 1: Create Model File

Create a new file in your module's models directory:

```typescript
// src/modules/projects/models/project.model.ts
import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  boolean,
  text,
} from 'drizzle-orm/pg-core';
import { users } from '@modules/core/auth/models/user.model';

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Foreign key to users table
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),

  // Project fields
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 50 }).default('active').notNull(),
  isPublic: boolean('is_public').default(false).notNull(),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Export types for TypeScript
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
```

#### Step 2: Export in Central Schema

Add your schema to the central export:

```typescript
// src/database/schema/index.ts

// ... existing exports ...

// Add your new schema
export {
  projects,
  type Project,
  type NewProject,
} from '@modules/projects/models/project.model';
```

#### Step 3: Generate Migration

```bash
# Generate migration from schema changes
pnpm drizzle-kit generate
```

#### Step 4: Run Migration

```bash
# Apply migration to database
pnpm drizzle-kit migrate
```

### Schema Best Practices

1. **Always use UUIDs for primary keys** (compatible with Supabase)

   ```typescript
   id: uuid('id').primaryKey().defaultRandom();
   ```

2. **Include timestamps on all tables**

   ```typescript
   createdAt: timestamp('created_at').defaultNow().notNull(),
   updatedAt: timestamp('updated_at').defaultNow().notNull(),
   ```

3. **Use enums for status fields**

   ```typescript
   export const statusEnum = pgEnum('status', ['active', 'inactive', 'archived']);

   status: statusEnum('status').default('active').notNull(),
   ```

4. **Add indexes for foreign keys and search fields**

   ```typescript
   export const projects = pgTable(
     'projects',
     {
       // ... fields ...
     },
     (table) => ({
       userIdx: index('projects_user_idx').on(table.userId),
       statusIdx: index('projects_status_idx').on(table.status),
     }),
   );
   ```

5. **Use cascade delete for dependent data**

   ```typescript
   userId: uuid('user_id')
     .references(() => users.id, { onDelete: 'cascade' })
     .notNull(),
   ```

---

## 🔄 Migrations

### Understanding Migrations

Drizzle Kit automatically generates SQL migrations by comparing your schema files with your database.

### Migration Workflow

```bash
# 1. Introspect database (get current state)
pnpm drizzle-kit introspect

# 2. Make changes to your schema files
# Edit src/modules/*/models/*.model.ts

# 3. Export new schema in src/database/schema/index.ts
# Add: export { projects } from '@modules/projects/models/project.model';

# 4. Generate migration
pnpm drizzle-kit generate

# 5. Review the generated SQL
# Check: src/database/migrations/0001_*.sql

# 6. Apply migration
pnpm drizzle-kit migrate
```

### Common Migration Commands

```bash
# Check for pending migrations
pnpm drizzle-kit check

# Drop all tables (DESTRUCTIVE - use with caution)
pnpm drizzle-kit drop

# Generate migration with custom name
pnpm drizzle-kit generate:custom --name add_projects_table

# Push schema changes without generating migration files (dev only)
pnpm drizzle-kit push
```

### Migration Best Practices

1. **Always introspect before generating**

   ```bash
   pnpm drizzle-kit introspect
   pnpm drizzle-kit generate
   ```

2. **Review generated SQL before applying**

   ```bash
   # Check the SQL file in src/database/migrations/
   cat src/database/migrations/0001_*.sql
   ```

3. **Never edit generated migrations manually**
   - If migration is wrong, fix your schema and regenerate
   - Editing migrations can cause sync issues

4. **Commit migrations to version control**

   ```bash
   git add src/database/migrations/
   git commit -m "Add projects table migration"
   ```

5. **Test migrations in development first**

   ```bash
   # Use a test database
   DATABASE_URL=postgresql://localhost:5432/test_db pnpm drizzle-kit migrate
   ```

---

## 💡 Usage Examples

### Basic CRUD Operations

```typescript
import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@database/database.service';
import { projects, users } from '@database/schema';
import { eq, and, like, desc } from 'drizzle-orm';

@Injectable()
export class ProjectService {
  constructor(private readonly db: DatabaseService) {}

  // CREATE
  async create(data: NewProject) {
    const [project] = await this.db.db
      .insert(projects)
      .values(data)
      .returning();

    return project;
  }

  // READ - Find all
  async findAll() {
    return this.db.db.select().from(projects).orderBy(desc(projects.createdAt));
  }

  // READ - Find one
  async findOne(id: string) {
    const [project] = await this.db.db
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1);

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }

  // UPDATE
  async update(id: string, data: Partial<NewProject>) {
    const [updated] = await this.db.db
      .update(projects)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();

    if (!updated) {
      throw new NotFoundException('Project not found');
    }

    return updated;
  }

  // DELETE
  async remove(id: string) {
    const [deleted] = await this.db.db
      .delete(projects)
      .where(eq(projects.id, id))
      .returning();

    if (!deleted) {
      throw new NotFoundException('Project not found');
    }

    return deleted;
  }

  // SEARCH
  async search(query: string) {
    return this.db.db
      .select()
      .from(projects)
      .where(like(projects.name, `%${query}%`))
      .orderBy(desc(projects.createdAt));
  }

  // FILTER
  async findByUser(userId: string, status?: string) {
    const conditions = [eq(projects.userId, userId)];

    if (status) {
      conditions.push(eq(projects.status, status));
    }

    return this.db.db
      .select()
      .from(projects)
      .where(and(...conditions));
  }
}
```

### Advanced Queries

```typescript
// JOIN with relationships
async getProjectsWithUsers() {
  return this.db.db
    .select({
      project: projects,
      user: users,
    })
    .from(projects)
    .leftJoin(users, eq(projects.userId, users.id));
}

// AGGREGATE
async getProjectStats() {
  const result = await this.db.db
    .select({
      total: count(),
      active: count(eq(projects.status, 'active')),
      archived: count(eq(projects.status, 'archived')),
    })
    .from(projects);

  return result[0];
}

// SUBQUERY
async getActiveProjectsWithOwner() {
  return this.db.db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.status, 'active'),
        exists(
          this.db.db
            .select()
            .from(users)
            .where(eq(users.id, projects.userId))
        )
      )
    );
}

// PAGINATION
async findPaginated(page: number = 1, limit: number = 10) {
  const offset = (page - 1) * limit;

  const [items, total] = await Promise.all([
    this.db.db
      .select()
      .from(projects)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(projects.createdAt)),

    this.db.db
      .select({ count: count() })
      .from(projects),
  ]);

  return {
    items,
    total: total[0].count,
    page,
    limit,
    totalPages: Math.ceil(total[0].count / limit),
  };
}
```

---

## 🔗 Relationships

### One-to-Many Relationship

```typescript
// User has many Projects
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }),
});

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  name: varchar('name', { length: 255 }).notNull(),
});

// Query with relationship
async getUserProjects(userId: string) {
  return this.db.db
    .select()
    .from(projects)
    .where(eq(projects.userId, userId));
}

// Query with JOIN
async getUserWithProjects(userId: string) {
  return this.db.db
    .select({
      user: users,
      project: projects,
    })
    .from(users)
    .leftJoin(projects, eq(users.id, projects.userId))
    .where(eq(users.id, userId));
}
```

### Many-to-Many Relationship

```typescript
// Students and Projects (many-to-many)
export const students = pgTable('students', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
});

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
});

// Junction table
export const studentProjects = pgTable('student_projects', {
  studentId: uuid('student_id')
    .references(() => students.id, { onDelete: 'cascade' })
    .notNull(),
  projectId: uuid('project_id')
    .references(() => projects.id, { onDelete: 'cascade' })
    .notNull(),
  role: varchar('role', { length: 50 }),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey(table.studentId, table.projectId),
}));

// Query many-to-many
async getStudentProjects(studentId: string) {
  return this.db.db
    .select({
      project: projects,
      role: studentProjects.role,
      joinedAt: studentProjects.joinedAt,
    })
    .from(studentProjects)
    .leftJoin(projects, eq(studentProjects.projectId, projects.id))
    .where(eq(studentProjects.studentId, studentId));
}
```

---

## 🔒 Transactions

### Basic Transaction

```typescript
async createProjectWithTasks(projectData: NewProject, tasks: NewTask[]) {
  return this.db.db.transaction(async (tx) => {
    // Insert project
    const [project] = await tx
      .insert(projects)
      .values(projectData)
      .returning();

    // Insert tasks
    const tasksWithProjectId = tasks.map(task => ({
      ...task,
      projectId: project.id,
    }));

    await tx.insert(tasks).values(tasksWithProjectId);

    return project;
  });
}
```

### Transaction with Error Handling

```typescript
async transferProjectOwnership(projectId: string, newUserId: string) {
  try {
    return await this.db.db.transaction(async (tx) => {
      // Update project
      const [project] = await tx
        .update(projects)
        .set({ userId: newUserId, updatedAt: new Date() })
        .where(eq(projects.id, projectId))
        .returning();

      if (!project) {
        throw new NotFoundException('Project not found');
      }

      // Log the transfer
      await tx.insert(auditLogs).values({
        action: 'project_transfer',
        projectId,
        oldUserId: project.userId,
        newUserId,
        timestamp: new Date(),
      });

      return project;
    });
  } catch (error) {
    // Transaction automatically rolled back on error
    throw new AppError(
      ERROR_CODES.DATABASE_ERROR,
      'Failed to transfer project ownership',
      { projectId, newUserId, error: error.message }
    );
  }
}
```

### Nested Transactions

```typescript
async complexOperation() {
  return this.db.db.transaction(async (tx1) => {
    // First operation
    const [user] = await tx1.insert(users).values({...}).returning();

    // Nested transaction
    await tx1.transaction(async (tx2) => {
      await tx2.insert(projects).values({...});
      await tx2.insert(tasks).values({...});
    });

    return user;
  });
}
```

---

## 🧪 Testing

### Unit Testing with Mock Database

```typescript
// src/modules/projects/__tests__/project.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ProjectService } from '../project.service';
import { DatabaseService } from '@database/database.service';

describe('ProjectService', () => {
  let service: ProjectService;
  let mockDb: any;

  beforeEach(async () => {
    // Create mock database
    mockDb = {
      db: {
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
        insert: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectService,
        {
          provide: DatabaseService,
          useValue: mockDb,
        },
      ],
    }).compile();

    service = module.get<ProjectService>(ProjectService);
  });

  it('should find all projects', async () => {
    const mockProjects = [
      { id: '1', name: 'Project 1' },
      { id: '2', name: 'Project 2' },
    ];

    mockDb.db.limit.mockResolvedValue(mockProjects);

    const result = await service.findAll();

    expect(result).toEqual(mockProjects);
    expect(mockDb.db.select).toHaveBeenCalled();
  });

  it('should create a project', async () => {
    const newProject = { name: 'New Project', userId: 'user-1' };
    const createdProject = { id: '1', ...newProject };

    mockDb.db.returning.mockResolvedValue([createdProject]);

    const result = await service.create(newProject);

    expect(result).toEqual(createdProject);
    expect(mockDb.db.insert).toHaveBeenCalled();
  });
});
```

### Integration Testing with Test Database

```typescript
// test/database.integration.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseModule } from '@database/database.module';
import { DatabaseService } from '@database/database.service';
import { users, projects } from '@database/schema';
import { eq } from 'drizzle-orm';

describe('Database Integration Tests', () => {
  let db: DatabaseService;
  let testUserId: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [DatabaseModule],
    }).compile();

    db = module.get<DatabaseService>(DatabaseService);
  });

  beforeEach(async () => {
    // Create test user
    const [user] = await db.db
      .insert(users)
      .values({ email: 'test@example.com', name: 'Test User' })
      .returning();

    testUserId = user.id;
  });

  afterEach(async () => {
    // Clean up
    await db.db.delete(projects).where(eq(projects.userId, testUserId));
    await db.db.delete(users).where(eq(users.id, testUserId));
  });

  it('should create and retrieve project', async () => {
    // Create
    const [project] = await db.db
      .insert(projects)
      .values({
        userId: testUserId,
        name: 'Test Project',
        status: 'active',
      })
      .returning();

    expect(project.id).toBeDefined();
    expect(project.name).toBe('Test Project');

    // Retrieve
    const [retrieved] = await db.db
      .select()
      .from(projects)
      .where(eq(projects.id, project.id));

    expect(retrieved.name).toBe('Test Project');
  });

  it('should cascade delete', async () => {
    // Create project
    await db.db.insert(projects).values({
      userId: testUserId,
      name: 'Test Project',
    });

    // Delete user (should cascade to projects)
    await db.db.delete(users).where(eq(users.id, testUserId));

    // Verify project deleted
    const remainingProjects = await db.db
      .select()
      .from(projects)
      .where(eq(projects.userId, testUserId));

    expect(remainingProjects).toHaveLength(0);
  });
});
```

---

## ⚙️ Configuration

### Database Connection Options

```typescript
// src/database/drizzle.ts
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,

  // SSL Configuration (required for Supabase)
  ssl: {
    rejectUnauthorized: false,
  },

  // Connection Pool Settings
  max: 20, // Maximum connections in pool
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: 10000, // Timeout after 10s

  // Optional: Statement timeout
  statement_timeout: 30000, // Query timeout (30s)
});
```

### Drizzle Kit Configuration

```typescript
// drizzle.config.ts
import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config();

export default {
  schema: './src/database/schema/index.ts',
  out: './src/database/migrations',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
} satisfies Config;
```

---

## 🛠️ Best Practices

### 1. Always Export Schema from Central Index

```typescript
// ✅ GOOD
// src/database/schema/index.ts
export { projects } from '@modules/projects/models/project.model';

// ❌ BAD - Importing directly without central export
import { projects } from '@modules/projects/models/project.model';
```

### 2. Use Type-Safe Queries

```typescript
// ✅ GOOD - Type-safe
import { eq } from 'drizzle-orm';
const [user] = await db.select().from(users).where(eq(users.id, id));

// ❌ BAD - Raw SQL (avoid unless necessary)
const result = await db.execute(`SELECT * FROM users WHERE id = '${id}'`);
```

### 3. Always Use Transactions for Multiple Operations

```typescript
// ✅ GOOD - Atomic operation
await db.transaction(async (tx) => {
  await tx.insert(users).values(userData);
  await tx.insert(profiles).values(profileData);
});

// ❌ BAD - Non-atomic, can leave partial data
await db.insert(users).values(userData);
await db.insert(profiles).values(profileData); // Might fail
```

### 4. Handle Errors Properly

```typescript
// ✅ GOOD - Proper error handling
try {
  const result = await db.insert(users).values(data).returning();
  return result[0];
} catch (error) {
  if (error.code === '23505') {
    // Unique violation
    throw new ConflictException('User already exists');
  }
  throw new AppError(ERROR_CODES.DATABASE_ERROR, 'Failed to create user');
}

// ❌ BAD - No error handling
const result = await db.insert(users).values(data).returning();
return result[0];
```

### 5. Use Indexes for Foreign Keys

```typescript
// ✅ GOOD - Indexed foreign key
export const projects = pgTable(
  'projects',
  {
    userId: uuid('user_id')
      .references(() => users.id)
      .notNull(),
  },
  (table) => ({
    userIdx: index('projects_user_idx').on(table.userId), // ✅ Add index
  }),
);

// ❌ BAD - Missing index
export const projects = pgTable('projects', {
  userId: uuid('user_id')
    .references(() => users.id)
    .notNull(),
  // No index - slow queries
});
```

### 6. Introspect Before Generating Migrations

```bash
# ✅ GOOD - Always introspect first
pnpm drizzle-kit introspect
pnpm drizzle-kit generate
pnpm drizzle-kit migrate

# ❌ BAD - Generate without introspecting
pnpm drizzle-kit generate # Might miss changes
```

---

## 🐛 Troubleshooting

### Common Issues

#### 1. "DATABASE_URL is not set"

**Problem:** Database connection fails

**Solution:**

```typescript
// Check your .env file
DATABASE_URL=postgresql://user:password@localhost:5432/db

// Verify it's loaded
console.log('DB URL:', process.env.DATABASE_URL);

// Ensure dotenv is loaded
import * as dotenv from 'dotenv';
dotenv.config();
```

#### 2. "relation does not exist"

**Problem:** Table not found in database

**Solution:**

```bash
# Check if migration was run
pnpm drizzle-kit check

# Run pending migrations
pnpm drizzle-kit migrate

# Verify table exists in database
psql $DATABASE_URL -c "\dt"
```

#### 3. "Connection timeout"

**Problem:** Can't connect to database

**Solution:**

```typescript
// Check connection settings in drizzle.ts
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 10000, // Increase if needed

  // For Supabase, SSL is required
  ssl: {
    rejectUnauthorized: false,
  },
});

// Test connection
const testConnection = async () => {
  const client = await pool.connect();
  await client.query('SELECT NOW()');
  client.release();
  console.log('✅ Database connected');
};
```

#### 4. "Schema export not found"

**Problem:** Can't import schema

**Solution:**

```typescript
// ✅ Always export in schema/index.ts
// src/database/schema/index.ts
export { projects } from '@modules/projects/models/project.model';

// Then import from central location
import { projects } from '@database/schema';
```

#### 5. "Migration conflicts"

**Problem:** Migration generation fails

**Solution:**

```bash
# 1. Introspect to sync with database
pnpm drizzle-kit introspect

# 2. If still conflicts, check for:
# - Uncommitted schema changes
# - Manual database modifications
# - Missing exports in schema/index.ts

# 3. Reset if needed (DESTRUCTIVE)
pnpm drizzle-kit drop  # Drops all tables
pnpm drizzle-kit push  # Push fresh schema

# 4. Or manually fix in database
psql $DATABASE_URL
# Then manually drop conflicting tables
```

#### 6. "Type errors with schema imports"

**Problem:** TypeScript can't find schema types

**Solution:**

```typescript
// ✅ Ensure tsconfig.json has correct paths
{
  "compilerOptions": {
    "paths": {
      "@database/*": ["src/database/*"],
      "@modules/*": ["src/modules/*"]
    }
  }
}

// ✅ Use correct import path
import { users, type User, type NewUser } from '@database/schema';

// ❌ Don't import from model directly
import { users } from '@modules/core/auth/models/user.model';
```

#### 7. "Duplicate key violation"

**Problem:** `ERROR: duplicate key value violates unique constraint`

**Solution:**

```typescript
// Handle unique constraint violations
try {
  await db.insert(users).values({ email: 'test@example.com' });
} catch (error) {
  if (error.code === '23505') {
    throw new ConflictException('User with this email already exists');
  }
  throw error;
}

// Or check before inserting
const existing = await db
  .select()
  .from(users)
  .where(eq(users.email, email))
  .limit(1);

if (existing.length > 0) {
  throw new ConflictException('User already exists');
}
```

#### 8. "Transaction timeout"

**Problem:** Transaction takes too long

**Solution:**

```typescript
// Increase statement timeout in pool config
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  statement_timeout: 60000, // 60 seconds
});

// Or break into smaller transactions
async createManyRecords(records: any[]) {
  const batchSize = 100;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    await this.db.db.transaction(async (tx) => {
      await tx.insert(table).values(batch);
    });
  }
}
```

#### 9. "Cannot find module '@database/schema'"

**Problem:** Module resolution fails

**Solution:**

```bash
# 1. Check tsconfig.json paths configuration
# 2. Restart TypeScript server in your IDE
# 3. Clear build cache
rm -rf dist/
pnpm build

# 4. Verify schema/index.ts exports everything
# src/database/schema/index.ts
export * from '@modules/core/auth/models/user.model';
```

---

## 📊 Performance Tips

### 1. Use Prepared Statements

```typescript
// For repeated queries, use prepared statements
const getUserById = db.query.users
  .findFirst({
    where: (users, { eq }) => eq(users.id, placeholder('id')),
  })
  .prepare('get_user_by_id');

// Then execute
const user = await getUserById.execute({ id: '123' });
```

### 2. Batch Operations

```typescript
// ✅ GOOD - Single insert for multiple records
await db.insert(users).values([
  { email: 'user1@test.com', name: 'User 1' },
  { email: 'user2@test.com', name: 'User 2' },
  { email: 'user3@test.com', name: 'User 3' },
]);

// ❌ BAD - Multiple individual inserts
for (const userData of users) {
  await db.insert(users).values(userData);
}
```

### 3. Use Indexes Wisely

```typescript
// Add indexes for frequently queried columns
export const users = pgTable(
  'users',
  {
    email: varchar('email', { length: 255 }).notNull(),
    status: varchar('status', { length: 50 }),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    emailIdx: index('users_email_idx').on(table.email),
    statusIdx: index('users_status_idx').on(table.status),
    createdAtIdx: index('users_created_at_idx').on(table.createdAt),
  }),
);
```

### 4. Limit Result Sets

```typescript
// ✅ GOOD - Always use limits
const recentUsers = await db
  .select()
  .from(users)
  .orderBy(desc(users.createdAt))
  .limit(100); // Prevent loading millions of rows

// ❌ BAD - No limit
const allUsers = await db.select().from(users);
```

### 5. Use SELECT Specific Columns

```typescript
// ✅ GOOD - Select only needed columns
const userEmails = await db.select({ email: users.email }).from(users);

// ❌ BAD - Select all columns when you only need one
const users = await db.select().from(users);
const emails = users.map((u) => u.email);
```

---

## 🔐 Security Best Practices

### 1. Never Interpolate User Input

```typescript
// ❌ DANGEROUS - SQL Injection vulnerability
const searchTerm = req.query.search;
await db.execute(`SELECT * FROM users WHERE name = '${searchTerm}'`);

// ✅ SAFE - Use parameterized queries
import { like } from 'drizzle-orm';
await db
  .select()
  .from(users)
  .where(like(users.name, `%${searchTerm}%`));
```

### 2. Validate Input Before Database Operations

```typescript
// ✅ GOOD - Validate with class-validator
import { IsEmail, IsString, MinLength } from 'class-validator';

class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(3)
  name: string;
}

async createUser(dto: CreateUserDto) {
  // dto is already validated by ValidationPipe
  return this.db.db.insert(users).values(dto).returning();
}
```

### 3. Use Row-Level Security (Supabase)

```sql
-- Enable RLS on tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own data"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  USING (auth.uid() = id);
```

### 4. Sanitize Sensitive Data in Logs

```typescript
// ✅ GOOD - Don't log sensitive data
async login(email: string, password: string) {
  this.logger.log(`Login attempt for user: ${email}`);
  // password is NOT logged

  const user = await this.findByEmail(email);
  // ...
}

// ❌ BAD - Logging sensitive data
this.logger.log(`Login with credentials: ${email}, ${password}`);
```

---

## 📚 Additional Resources

### Official Documentation

- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [Drizzle Kit Docs](https://orm.drizzle.team/kit-docs/overview)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Supabase Database Docs](https://supabase.com/docs/guides/database)

### Useful Drizzle Queries Reference

```typescript
// WHERE clauses
import {
  eq,
  ne,
  gt,
  gte,
  lt,
  lte,
  like,
  ilike,
  inArray,
  notInArray,
  isNull,
  isNotNull,
  and,
  or,
  not,
} from 'drizzle-orm';

// Equal
where(eq(users.id, '123'));

// Not equal
where(ne(users.status, 'deleted'));

// Greater than / Less than
where(gt(users.age, 18));
where(lt(users.age, 65));

// LIKE / ILIKE (case-insensitive)
where(like(users.name, '%john%'));
where(ilike(users.email, '%@gmail.com'));

// IN array
where(inArray(users.status, ['active', 'pending']));

// NULL checks
where(isNull(users.deletedAt));
where(isNotNull(users.verifiedAt));

// Combining conditions
where(and(eq(users.role, 'admin'), isNull(users.deletedAt)));

where(or(eq(users.role, 'admin'), eq(users.role, 'moderator')));

// ORDER BY
orderBy(desc(users.createdAt));
orderBy(asc(users.name));

// LIMIT & OFFSET
limit(10);
offset(20);

// JOINS
leftJoin(projects, eq(users.id, projects.userId));
innerJoin(profiles, eq(users.id, profiles.userId));

// COUNT
select({ count: count() }).from(users);

// DISTINCT
selectDistinct({ status: users.status }).from(users);
```

---

## 🎓 Learning Path

If you're new to Drizzle ORM, follow this learning path:

1. **Start Simple** - Basic CRUD operations (15 min)

   ```typescript
   // Insert, Select, Update, Delete
   ```

2. **Learn Filtering** - WHERE clauses (15 min)

   ```typescript
   // eq, like, and, or conditions
   ```

3. **Master Joins** - Relationships (30 min)

   ```typescript
   // leftJoin, innerJoin, select multiple tables
   ```

4. **Practice Transactions** - Data integrity (20 min)

   ```typescript
   // db.transaction(), error handling
   ```

5. **Optimize Queries** - Performance (20 min)

   ```typescript
   // Indexes, limits, select specific columns
   ```

6. **Build Real Features** - Apply what you learned

   ```typescript
   // User management, project CRUD, search, pagination
   ```

---

## 📞 Support

For issues, questions, or contributions:

- **Drizzle Discord**: [discord.gg/drizzle](https://discord.gg/drizzle)
- **GitHub Issues**: [Your Repository](https://github.com/your-repo/issues)
- **Documentation**: This README
- **Team Lead**: `@your-slack-handle`

---

## 🔄 Migration from Other ORMs

### From TypeORM

```typescript
// TypeORM
@Entity()
class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;
}

// Drizzle equivalent
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }),
});
```

### From Prisma

```prisma
// Prisma schema
model User {
  id    String @id @default(uuid())
  name  String
}
```

```typescript
// Drizzle equivalent
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }),
});
```

---

## 📄 License

This module is [MIT licensed](LICENSE).

---

## 🙏 Acknowledgments

Built with:

- [Drizzle ORM](https://orm.drizzle.team/) - Type-safe SQL ORM
- [PostgreSQL](https://www.postgresql.org/) - Open source database
- [Supabase](https://supabase.com/) - Open source Firebase alternative
- [NestJS](https://nestjs.com/) - Progressive Node.js framework

---

**Last Updated:** December 2025  
**Module Version:** 1.0.0  
**Drizzle ORM Version:** ^0.29.0  
**Status:** Production Ready ✅
