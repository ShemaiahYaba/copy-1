# Gradlinq Consolidated Architecture Guide

> **Version**: 2.0 (Consolidated)  
> **Last Updated**: January 2026  
> **Purpose**: Unified architecture and folder structure guide for Gradlinq backend development

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Canonical Folder Structure](#2-canonical-folder-structure)
3. [Module Anatomy](#3-module-anatomy)
4. [Database Layer Architecture](#4-database-layer-architecture)
5. [Module Creation Workflow](#5-module-creation-workflow)
6. [Cross-Cutting Concerns](#6-cross-cutting-concerns)
7. [GraphQL Code-First Conventions](#7-graphql-code-first-conventions)
8. [Quick Reference Checklist](#8-quick-reference-checklist)

---

## 1. Design Philosophy

### 1.1 Domain-Driven Modularity

Gradlinq organizes code by **business domains**, not technical layers. Each module is a self-contained unit representing a core business capability.

**Core Principles:**

- **Single Responsibility**: Each module handles one domain (projects, teams, auth, etc.)
- **Encapsulation**: Modules expose services through well-defined interfaces
- **Independence**: Modules can evolve without breaking others
- **Shared Nothing**: Direct repository access is forbidden; use service injection

### 1.2 Three-Tier Module Structure

Every module follows a consistent internal hierarchy:

```markdown
Module (Domain Boundary)
├── Models Layer ← Database tables (Drizzle ORM)
├── Relations Layer ← Local query enhancements
├── Entities Layer ← GraphQL types
├── Service Layer ← Business logic
└── API Layer ← Controllers/Resolvers
```

### 1.3 Technology Stack

- **Framework**: NestJS (strict mode, TypeScript)
- **Database**: PostgreSQL via Supabase + Drizzle ORM
- **Authentication**: Supabase Auth with OTP flow
- **API**: GraphQL Code-First (primary), REST (secondary)
- **Real-time**: WebSockets via Socket.IO
- **Validation**: class-validator + class-transformer

---

## 2. Canonical Folder Structure

This is the **single source of truth** for folder organization:

```markdown
src/
├── main.ts # Application entry point
├── app.module.ts # Root module
├── instrument.ts # Sentry initialization (AFTER env config)
│
├── config/ # Configuration management
│ ├── environment.ts # Centralized env config (MUST initialize first)
│ └── database.config.ts
│
├── database/ # Database layer
│ ├── database.service.ts # Drizzle client wrapper
│ ├── database.module.ts
│ ├── schema/
│ │ └── index.ts # Central schema registry (Drizzle entry point)
│ └── migrations/ # Generated migration files
│
├── core/ # Framework-level concerns
│ ├── guards/ # JWT, Roles guards
│ ├── interceptors/ # Logging, transformation
│ ├── filters/ # Exception filters
│ └── decorators/ # Custom decorators (@CurrentUser, @Roles)
│
├── shared/ # Cross-cutting business utilities
│ ├── error/ # Error handling module
│ │ ├── error.module.ts
│ │ ├── error.service.ts
│ │ ├── constants/ # ERROR_CODES
│ │ └── classes/ # AppError, ValidationError, BusinessError
│ ├── notification/ # WebSocket notification system
│ │ ├── notification.module.ts
│ │ ├── notification.service.ts
│ │ └── notification.gateway.ts
│ ├── context/ # Request-scoped context
│ │ ├── context.module.ts
│ │ └── context.service.ts
│ └── sentry/ # Sentry integration
│ └── sentry.module.ts
│
└── modules/ # Business domain modules
├── core/ # Core business domains
│ └── auth/ # Authentication domain
│ ├── auth.module.ts
│ ├── auth.service.ts
│ ├── auth.controller.ts
│ ├── services/
│ │ ├── supabase.service.ts
│ │ └── user.service.ts
│ ├── models/ # Database models
│ │ ├── user.model.ts
│ │ ├── client.model.ts
│ │ ├── supervisor.model.ts
│ │ ├── student.model.ts
│ │ └── README.md # Explains table structure
│ ├── relations/ # Module-local relations
│ │ ├── user.relations.ts
│ │ └── README.md # Explains relation usage
│ ├── entities/ # GraphQL entities
│ │ ├── user.entity.ts
│ │ └── auth-response.entity.ts
│ ├── dto/
│ │ ├── register-client.dto.ts
│ │ ├── verify-otp.dto.ts
│ │ └── login.dto.ts
│ └── interfaces/
│ └── auth-payload.interface.ts
│
├── projects/ # Project management domain
│ ├── projects.module.ts
│ ├── projects.service.ts
│ ├── projects.resolver.ts
│ ├── projects.controller.ts
│ ├── models/
│ │ ├── project.model.ts
│ │ └── README.md
│ ├── relations/
│ │ ├── project.relations.ts
│ │ └── README.md
│ ├── entities/
│ │ └── project.entity.ts
│ ├── dto/
│ │ ├── create-project.dto.ts
│ │ └── update-project.dto.ts
│ └── interfaces/
│ └── project-eligibility.interface.ts
│
├── teams/ # Team management domain
│ ├── teams.module.ts
│ ├── teams.service.ts
│ ├── teams.resolver.ts
│ ├── models/
│ │ ├── team.model.ts
│ │ └── team-assignment.model.ts
│ ├── relations/
│ ├── entities/
│ ├── dto/
│ └── interfaces/
│
├── experiences/ # Student experiences domain
│ ├── experiences.module.ts
│ ├── experiences.service.ts
│ ├── experiences.resolver.ts
│ ├── models/
│ │ ├── experience.model.ts
│ │ └── experience-participant.model.ts
│ ├── relations/
│ ├── entities/
│ ├── dto/
│ └── interfaces/
│
├── bookmarks/ # Student bookmarks domain
│ ├── bookmarks.module.ts
│ ├── bookmarks.service.ts
│ ├── bookmarks.resolver.ts
│ ├── models/
│ │ └── bookmark.model.ts
│ ├── entities/
│ └── dto/
│
├── messaging/ # Real-time messaging domain
│ ├── messaging.module.ts
│ ├── messaging.service.ts
│ ├── messaging.gateway.ts
│ ├── models/
│ │ ├── message.model.ts
│ │ └── thread.model.ts
│ ├── entities/
│ └── dto/
│
├── matching/ # Project-student matching logic
│ ├── matching.module.ts
│ ├── matching.service.ts
│ ├── models/
│ │ └── project-match.model.ts
│ └── utils/
│ └── matching-algorithm.ts
│
└── dashboard/ # Student dashboard aggregation
├── dashboard.module.ts
├── dashboard.service.ts
├── dashboard.resolver.ts
└── dto/
└── dashboard-filter.dto.ts
```

---

## 3. Module Anatomy

### 3.1 Required Files per Module

Every business module **MUST** contain:

| File | Purpose | Required? |
| ---- | ------- | --------- |

| `*.module.ts` | Module registration, imports, exports | ✅ Yes |
| `*.service.ts` | Business logic layer | ✅ Yes |
| `*.resolver.ts` OR `*.controller.ts` | API entry point (GraphQL or REST) | ✅ Yes |
| `models/` | Drizzle ORM table definitions | ✅ Yes |
| `entities/` | GraphQL types (if using GraphQL) | ✅ Yes (for GraphQL) |
| `dto/` | Input/output validation schemas | ✅ Yes |
| `README.md` | Module purpose and dependencies | ✅ Yes |
| `relations/` | Module-local Drizzle relations | ⚠️ Optional |
| `interfaces/` | Shared contracts for inter-module use | ⚠️ Optional |

### 3.2 Module Structure Example

```typescript
// projects/projects.module.ts
@Module({
  imports: [DatabaseModule, ContextModule, NotificationModule],
  providers: [ProjectsService, ProjectsResolver],
  exports: [ProjectsService], // ← Export for other modules
})
export class ProjectsModule {}
```

### 3.3 Service Layer Pattern

```typescript
// projects/projects.service.ts
@Injectable()
export class ProjectsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly contextService: ContextService,
    private readonly notificationService: NotificationService,
  ) {}

  async createProject(dto: CreateProjectDto): Promise<Project> {
    const userId = this.contextService.getUserId();

    const [project] = await this.db.db
      .insert(projects)
      .values({ ...dto, userId })
      .returning();

    await this.notificationService.push({
      type: NotificationType.SUCCESS,
      message: 'Project created successfully',
      context: { projectId: project.id },
    });

    return project;
  }
}
```

---

## 4. Database Layer Architecture

### 4.1 The Three-Layer Schema Model

Gradlinq uses a **layered approach** to prevent circular imports and maintain clean separation:

| Layer | Location | Purpose | Imports Allowed |
| ----- | -------- | ------- | --------------- |

| **Level 1: Models** | `/modules/*/models/*.model.ts` | Pure table definitions | None (Drizzle primitives only) |
| **Level 2: Relations** | `/modules/*/relations/*.relations.ts` | Module-local query enhancements | Models from THIS module only |
| **Level 3: Registry** | `/database/schema/index.ts` | Unified Drizzle entry point | All models (no relations) |

### 4.2 Model Definition Pattern

```typescript
// modules/projects/models/project.model.ts
import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
} from 'drizzle-orm/pg-core';

export const projects = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey(), // ✅ Always UUID
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    clientId: uuid('client_id') // ✅ UUID for FK
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    status: varchar('status', { length: 50 }).default('DRAFT'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    clientIdx: index('projects_client_idx').on(table.clientId),
  }),
);
```

**Critical Rules:**

- ✅ Always use `uuid()` for primary keys and foreign keys
- ✅ Always include `createdAt` and `updatedAt` timestamps
- ✅ Index all foreign key columns
- ❌ NEVER use `text()` for foreign keys referencing UUIDs

### 4.3 Relations Pattern (Optional)

```typescript
// modules/projects/relations/project.relations.ts
import { relations } from 'drizzle-orm';
import { projects } from '../models/project.model';
import { users } from '@modules/core/auth/models/user.model';

export const projectRelations = relations(projects, ({ one, many }) => ({
  client: one(users, {
    fields: [projects.clientId],
    references: [users.id],
  }),
  tasks: many(tasks),
}));
```

### 4.4 Central Schema Registry

```typescript
// database/schema/index.ts
// ✅ ONLY import models, NOT relations
import {
  users,
  clients,
  supervisors,
  students,
} from '@modules/core/auth/models/user.model';
import { projects } from '@modules/projects/models/project.model';
import { teams } from '@modules/teams/models/team.model';
import { experiences } from '@modules/experiences/models/experience.model';

export const schema = {
  // Auth
  users,
  clients,
  supervisors,
  students,

  // Domains
  projects,
  teams,
  experiences,
};
```

### 4.5 Migration Workflow

```bash
# 1. Create/modify model in src/modules/*/models/*.model.ts
# 2. Export model in src/database/schema/index.ts
# 3. Generate migration
pnpm drizzle-kit generate

# 4. Review generated SQL
cat src/database/migrations/0001_*.sql

# 5. Run migration
pnpm drizzle-kit migrate
```

---

## 5. Module Creation Workflow

### 5.1 Using NestJS CLI (Recommended)

```bash
# Generate a new resource (GraphQL Code-First)
nest g resource modules/bookmarks

# When prompted:
# - Transport layer: GraphQL (code first)
# - Generate CRUD entry points: Yes (for domain modules)
```

### 5.2 Manual Creation Steps

For modules that need custom structure:

1. **Create module folder**:

   ```bash
   mkdir -p src/modules/bookmarks/{models,entities,dto,services}
   ```

2. **Create core files**:

   ```bash
   touch src/modules/bookmarks/bookmarks.{module,service,resolver}.ts
   touch src/modules/bookmarks/models/bookmark.model.ts
   touch src/modules/bookmarks/entities/bookmark.entity.ts
   touch src/modules/bookmarks/dto/create-bookmark.dto.ts
   touch src/modules/bookmarks/README.md
   ```

3. **Define model** (Drizzle table)

4. **Export in schema registry**:

   ```typescript
   // database/schema/index.ts
   import { bookmarks } from '@modules/bookmarks/models/bookmark.model';

   export const schema = {
     // ...existing,
     bookmarks,
   };
   ```

5. **Generate migration**:

   ```bash
   pnpm drizzle-kit generate
   pnpm drizzle-kit migrate
   ```

6. **Create GraphQL entity**

7. **Create service and resolver**

8. **Register in app.module.ts**

---

## 6. Cross-Cutting Concerns

### 6.1 Error Handling Module

**Location**: `src/shared/error/`

**Usage**:

```typescript
import { AppError, ERROR_CODES } from '@shared/error';

throw new AppError(ERROR_CODES.RESOURCE_NOT_FOUND, 'Project not found', {
  projectId: id,
});
```

**Error Classes**:

- `AppError` - General application errors
- `ValidationError` - Input validation failures
- `BusinessError` - Business rule violations

**Severity Levels**:

- `low` - Informational
- `medium` - Operational errors (default)
- `high` - Auto-reported to Sentry
- `critical` - Non-operational, fatal

### 6.2 Context Module

**Location**: `src/shared/context/`

**Purpose**: Request-scoped user/tenant context

**Usage**:

```typescript
@Injectable()
export class ProjectsService {
  constructor(private contextService: ContextService) {}

  async createProject(dto: CreateProjectDto) {
    const userId = this.contextService.getUserId();
    const orgId = this.contextService.getOrgId();

    return this.db.db.insert(projects).values({
      ...dto,
      userId,
      organizationId: orgId,
    });
  }
}
```

**Auto-populated Fields**:

- `userId`, `email`, `orgId`, `correlationId`, `path`, `method`, `timestamp`

### 6.3 Notification Module

**Location**: `src/shared/notification/`

**Purpose**: Real-time WebSocket notifications

**Usage**:

```typescript
await this.notificationService.push({
  type: NotificationType.SUCCESS,
  message: 'Project created successfully',
  context: { projectId: project.id },
});
```

**Notification Types**:

- `SUCCESS` - Action completed
- `ERROR` - Action failed
- `INFO` - Informational update
- `UPDATE` - State change

### 6.4 Sentry Module

**Location**: `src/shared/sentry/`

**Critical Initialization Order** (in `main.ts`):

```typescript
import { EnvironmentConfig } from './config/environment';

// STEP 1: Load environment FIRST
EnvironmentConfig.initialize();

// STEP 2: Import instrument.ts AFTER env is loaded
import './instrument';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // ...
}
```

**Module Configuration** (in `app.module.ts`):

```typescript
@Module({
  imports: [
    SentryModule.forRoot(),           // 1. Sentry first
    NotificationModule.register(),    // 2. Notification module
    ErrorModule.register({            // 3. Error module (depends on both)
      enableSentry: process.env.NODE_ENV === 'production',
      notifyFrontend: true,
    }),
  ],
})
```

---

## 7. GraphQL Code-First Conventions

### 7.1 Entity Definition

```typescript
// entities/project.entity.ts
import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class Project {
  @Field(() => ID)
  id: string;

  @Field()
  title: string;

  @Field({ nullable: true })
  description?: string;

  @Field()
  status: string;

  @Field()
  createdAt: Date;
}
```

### 7.2 Input DTO

```typescript
// dto/create-project.dto.ts
import { InputType, Field } from '@nestjs/graphql';
import { IsString, IsNotEmpty, MinLength } from 'class-validator';

@InputType()
export class CreateProjectDto {
  @Field()
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  title: string;

  @Field({ nullable: true })
  @IsString()
  description?: string;
}
```

### 7.3 Resolver Pattern

```typescript
// projects.resolver.ts
import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard } from '@core/guards';
import { Roles, CurrentUser } from '@core/decorators';

@Resolver(() => Project)
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProjectsResolver {
  constructor(private readonly projectsService: ProjectsService) {}

  @Query(() => [Project])
  @Roles('client', 'supervisor')
  async projects(@CurrentUser() user: User) {
    return this.projectsService.findAll(user.id);
  }

  @Mutation(() => Project)
  @Roles('client')
  async createProject(
    @Args('input') input: CreateProjectDto,
    @CurrentUser() user: User,
  ) {
    return this.projectsService.create(input);
  }
}
```

---

## 8. Quick Reference Checklist

### Before Creating a New Module

- [ ] Does similar functionality exist in `shared/` modules?
- [ ] Have I checked existing error codes in `ERROR_CODES`?
- [ ] Do I need notifications? (use `NotificationService`)
- [ ] Do I need request context? (use `ContextService`)
- [ ] What guards do I need? (`@Roles()`, `@Public()`)

### Before Committing Code

- [ ] UUIDs used for all primary keys
- [ ] Foreign key types match referenced column types (uuid → uuid)
- [ ] Timestamps (createdAt, updatedAt) on all tables
- [ ] Transactions used for multi-table operations
- [ ] Proper error codes from `ERROR_CODES` constant
- [ ] class-validator decorators on all DTOs
- [ ] GraphQL decorators on all entities and resolvers
- [ ] Unit tests + integration tests written
- [ ] No sensitive data in error messages or logs
- [ ] Context service used where applicable
- [ ] Guards properly applied (`@Roles`, `@Public`)
- [ ] Module README.md updated

### Common Pitfalls to Avoid

- ❌ Don't use `text()` for foreign keys referencing UUIDs
- ❌ Don't import `instrument.ts` before `EnvironmentConfig.initialize()`
- ❌ Don't use localStorage/sessionStorage in artifacts
- ❌ Don't create duplicate abstractions
- ❌ Don't skip transactions for multi-table operations
- ❌ Don't use Passport.js (use direct Supabase integration)
- ❌ Don't return session tokens before OTP verification

---

## Summary

This consolidated guide provides:

1. **Single source of truth** for folder structure
2. **Clear module anatomy** with required files
3. **Three-layer database architecture** preventing circular imports
4. **Cross-cutting concern patterns** (errors, context, notifications)
5. **GraphQL code-first conventions**
6. **Pre-commit checklists** for quality assurance

Follow this structure to maintain consistency, scalability, and team collaboration across the Gradlinq codebase.

**Next Steps**: Use this guide when implementing student-facing APIs for experiences, bookmarks, project feed, inbox, and dashboard.
