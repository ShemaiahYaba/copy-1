# Gradlinq Backend Architecture Specification

> **Version**: 2.0 (Multi-Tenant Core + Domain Extensions)  
> **Last Updated**: January 2026  
> **Status**: Production Standard  
> **Purpose**: Definitive guide for building scalable, multi-tenant features in Gradlinq

---

## Table of Contents

1. [Architectural Philosophy](#1-architectural-philosophy)
2. [Core Concepts](#2-core-concepts)
3. [Folder Structure Standard](#3-folder-structure-standard)
4. [CRUD Pattern (Core Modules)](#4-crud-pattern-core-modules)
5. [Extension Pattern (Domain Modules)](#5-extension-pattern-domain-modules)
6. [Multi-Tenancy Implementation](#6-multi-tenancy-implementation)
7. [Service Injection & Dependencies](#7-service-injection--dependencies)
8. [Dos and Don'ts](#8-dos-and-donts)
9. [Decision Trees](#9-decision-trees)
10. [Common Patterns Library](#10-common-patterns-library)

---

## 1. Architectural Philosophy

### 1.1 The Two-Layer Model

Gradlinq follows a **Core + Domain** architecture:

```markdown
┌──────────────────────────────────────────────────┐
│ CORE MODULES (Data & Business Logic) │
│ - Pure CRUD operations │
│ - Shared business rules │
│ - Tenant-aware data access │
│ - Role-agnostic │
└──────────────────────────────────────────────────┘
▲
│ Inject & Extend
│
┌─────────────┼─────────────┐
│ │ │
┌───────▼──────┐ ┌────▼─────┐ ┌────▼──────┐
│ STUDENTS │ │SUPERVISORS│ │ CLIENTS │
│ (Domain) │ │ (Domain) │ │ (Domain) │
└──────────────┘ └───────────┘ └───────────┘
│ Orchestration│ │Orchestrate│ │Orchestrate│
│ Filtering │ │ Different │ │ Different │
│ Enrichment │ │ Views │ │ Workflows │
└──────────────┘ └───────────┘ └───────────┘
```

### 1.2 Design Principles

**Core Modules**:

- ✅ Handle all database operations (CRUD)
- ✅ Enforce multi-tenant filtering (universityId)
- ✅ Contain shared business logic (validation, calculations)
- ✅ Export services for domain consumption
- ❌ Never contain role-specific logic (student/supervisor/client)
- ❌ Never import domain modules (one-way dependency)

**Domain Modules**:

- ✅ Inject core services via dependency injection
- ✅ Orchestrate multiple core services
- ✅ Apply role-specific filtering and enrichment
- ✅ Handle presentation logic (DTOs, GraphQL entities)
- ✅ Implement role-specific authorization rules
- ❌ Never directly access repositories/database
- ❌ Never duplicate CRUD logic from core

### 1.3 Why This Architecture?

**Problem**: Traditional layered architecture leads to:

- God services handling all roles (1000+ line files)
- Tight coupling between role-specific logic
- Difficult to test role-specific behavior
- Hard to add new user types

**Solution**: Separation of concerns:

- **Core**: "What can be done with projects?" (CRUD)
- **Domain**: "How do students/supervisors/clients interact with projects?" (UX)

---

## 2. Core Concepts

### 2.1 Core Module

**Definition**: A module that represents a fundamental business entity with CRUD operations.

**Examples**: Projects, Teams, Messaging, Experiences, Bookmarks

**Characteristics**:

- Lives in `src/modules/{entity}/`
- Exports `{Entity}Service` for domain consumption
- Contains models, entities, DTOs, repositories
- Implements **tenant-aware** data access
- No role-specific logic

**When to Create**: When you need a new data entity that multiple user types will interact with differently.

### 2.2 Domain Module

**Definition**: A module that provides role-specific views and workflows by orchestrating core services.

**Examples**:

- `students/dashboard/` - Student view of projects, tasks, teams
- `supervisors/project-management/` - Supervisor view of projects
- `clients/project-posting/` - Client project submission workflow

**Characteristics**:

- Lives in `src/modules/{role}/subdomains/{feature}/`
- Injects core services (ProjectsService, TeamsService, etc.)
- Applies role-specific filtering
- Enriches data with role-specific calculations
- Implements role-specific authorization

**When to Create**: When you need to build a feature for a specific user type.

### 2.3 Multi-Tenancy

**Tenant Hierarchy**:

```markdown
University (Super-tenant)
├── Supervisors (Sub-tenant)
├── Students (End-user)
└── Clients (Partner tenant)
```

**Tenant Boundary**: `universityId` is the primary isolation key. All queries MUST filter by university.

**Context Service**: Provides tenant information for current request:

```typescript
{
  userId: string,
  role: 'student' | 'supervisor' | 'client' | 'university',
  universityId: string,      // ← Primary tenant key
  organizationId?: string,   // ← For clients
  studentId?: string,
  supervisorId?: string,
}
```

---

## 3. Folder Structure Standard

### 3.1 Complete Structure

```markdown
src/
├── main.ts
├── app.module.ts
├── instrument.ts
│
├── config/
│ ├── environment.ts # Load FIRST (before instrument.ts)
│ └── database.config.ts
│
├── database/
│ ├── database.service.ts
│ ├── database.module.ts
│ ├── schema/
│ │ └── index.ts # Central schema registry
│ └── migrations/
│
├── core/ # Framework concerns
│ ├── guards/
│ ├── interceptors/
│ ├── filters/
│ └── decorators/
│
├── shared/ # Cross-cutting utilities
│ ├── error/
│ ├── notification/
│ ├── context/
│ └── sentry/
│
└── modules/
│
├── core/ # Core auth (special case)
│ └── auth/
│
├── projects/ # ← CORE MODULE
│ ├── projects.module.ts
│ ├── projects.service.ts
│ ├── projects.controller.ts
│ ├── projects.resolver.ts
│ ├── models/
│ │ ├── project.model.ts
│ │ └── README.md
│ ├── relations/
│ │ └── project.relations.ts
│ ├── entities/
│ │ └── project.entity.ts
│ ├── dto/
│ │ ├── create-project.dto.ts
│ │ └── update-project.dto.ts
│ └── interfaces/
│ └── project-filters.interface.ts
│
├── teams/ # ← CORE MODULE
├── messaging/ # ← CORE MODULE
├── experiences/ # ← CORE MODULE
│
├── students/ # ← DOMAIN MODULE
│ ├── students.module.ts
│ ├── students.service.ts
│ ├── students.resolver.ts
│ └── subdomains/
│ ├── dashboard/
│ │ ├── dashboard.module.ts
│ │ ├── dashboard.service.ts
│ │ ├── dashboard.resolver.ts
│ │ ├── entities/
│ │ └── dto/
│ ├── project-feed/
│ │ ├── project-feed.module.ts
│ │ ├── project-feed.service.ts
│ │ └── project-feed.resolver.ts
│ ├── bookmarks/
│ ├── experiences/
│ └── inbox/
│
├── supervisors/ # ← DOMAIN MODULE
│ └── subdomains/
│ ├── project-management/
│ ├── team-management/
│ └── grading/
│
└── clients/ # ← DOMAIN MODULE
└── subdomains/
├── project-posting/
└── team-selection/
```

### 3.2 Naming Conventions

**Core Modules**:

- Folder: Plural entity name (`projects/`, `teams/`)
- Service: `{Entity}Service` (`ProjectsService`)
- Module: `{Entity}Module` (`ProjectsModule`)

**Domain Modules**:

- Folder: Plural role name (`students/`, `supervisors/`)
- Subfolder: Feature name (`dashboard/`, `project-feed/`)
- Service: `{Feature}Service` (`DashboardService`)
- Module: `{Feature}Module` (`DashboardModule`)

---

## 4. CRUD Pattern (Core Modules)

### 4.1 Core Service Template

Every core service follows this pattern:

```typescript
// src/modules/projects/projects.service.ts

import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DatabaseService } from '@database/database.service';
import { ContextService } from '@shared/context/context.service';
import { projects } from './models/project.model';
import { CreateProjectDto, UpdateProjectDto } from './dto';
import { AppError, ERROR_CODES } from '@shared/error';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly contextService: ContextService,
  ) {}

  /**
   * Find all projects with tenant filtering.
   * ALWAYS filters by universityId from context.
   */
  async findAll(filters?: ProjectFilters): Promise<Project[]> {
    const { universityId } = this.contextService.getContext();

    return this.db.db
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.universityId, universityId), // ← CRITICAL: Tenant isolation
          filters?.status ? eq(projects.status, filters.status) : undefined,
          filters?.clientId
            ? eq(projects.clientId, filters.clientId)
            : undefined,
        ),
      );
  }

  /**
   * Find project by ID with tenant validation.
   * Throws if project doesn't exist OR belongs to different university.
   */
  async findById(id: string): Promise<Project> {
    const { universityId } = this.contextService.getContext();

    const [project] = await this.db.db
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.id, id),
          eq(projects.universityId, universityId), // ← Prevent cross-tenant access
        ),
      );

    if (!project) {
      throw new AppError(ERROR_CODES.RESOURCE_NOT_FOUND, 'Project not found', {
        projectId: id,
        universityId,
      });
    }

    return project;
  }

  /**
   * Create project with automatic tenant assignment.
   */
  async create(dto: CreateProjectDto): Promise<Project> {
    const { universityId, userId } = this.contextService.getContext();

    const [project] = await this.db.db
      .insert(projects)
      .values({
        ...dto,
        universityId, // ← Auto-assign tenant
        createdBy: userId, // ← Track creator
      })
      .returning();

    return project;
  }

  /**
   * Update project with tenant validation.
   */
  async update(id: string, dto: UpdateProjectDto): Promise<Project> {
    // First verify ownership (tenant-aware)
    await this.findById(id);

    const [updated] = await this.db.db
      .update(projects)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();

    return updated;
  }

  /**
   * Delete project with tenant validation.
   */
  async delete(id: string): Promise<void> {
    // Verify ownership first
    await this.findById(id);

    await this.db.db.delete(projects).where(eq(projects.id, id));
  }

  /**
   * Batch query helper - used by domain services.
   * Returns projects by IDs (tenant-filtered).
   */
  async findByIds(ids: string[]): Promise<Project[]> {
    const { universityId } = this.contextService.getContext();

    return this.db.db
      .select()
      .from(projects)
      .where(
        and(inArray(projects.id, ids), eq(projects.universityId, universityId)),
      );
  }
}
```

### 4.2 Core Service Checklist

Every core service MUST:

- [ ] Inject `ContextService`
- [ ] Filter ALL queries by `universityId`
- [ ] Use `findById()` for tenant validation before updates/deletes
- [ ] Auto-assign `universityId` and `createdBy` on create
- [ ] Throw `AppError` with proper error codes
- [ ] Include `correlationId` in error context
- [ ] Export via module for domain consumption

### 4.3 Core Module Structure

```typescript
// src/modules/projects/projects.module.ts

@Module({
  imports: [DatabaseModule, ContextModule],
  providers: [ProjectsService],
  controllers: [ProjectsController], // Optional: For REST API
  resolvers: [ProjectsResolver], // Optional: For GraphQL
  exports: [ProjectsService], // ← CRITICAL: Export for domains
})
export class ProjectsModule {}
```

---

## 5. Extension Pattern (Domain Modules)

### 5.1 Domain Service Template

Domain services inject core services and add role-specific logic:

```typescript
// src/modules/students/subdomains/project-feed/project-feed.service.ts

import { Injectable } from '@nestjs/common';
import { ProjectsService } from '@modules/projects/projects.service';
import { ProjectMatchService } from '@modules/matching/project-match.service';
import { ContextService } from '@shared/context/context.service';
import { AppError, ERROR_CODES } from '@shared/error';

interface ProjectCard {
  id: string;
  title: string;
  organization: string;
  summary: string;
  skills: string[];
  difficulty: string;
  matchScore: number;
  postedAt: string;
}

@Injectable()
export class ProjectFeedService {
  constructor(
    // ← Inject CORE services (never repositories)
    private readonly projectsService: ProjectsService,
    private readonly matchService: ProjectMatchService,
    private readonly contextService: ContextService,
  ) {}

  /**
   * Get project feed for authenticated student.
   *
   * ROLE-SPECIFIC LOGIC:
   * 1. Filter projects by student eligibility
   * 2. Calculate match scores
   * 3. Sort by relevance
   * 4. Apply pagination
   */
  async getProjectFeed(filters: ProjectFeedFilters): Promise<ProjectCard[]> {
    const { studentId, skillTags, graduationStatus } =
      this.contextService.getContext();

    // Validate student context
    if (!studentId) {
      throw new AppError(
        ERROR_CODES.MISSING_CONTEXT,
        'Student context required',
      );
    }

    // Business rule: Graduated students cannot view feed
    if (graduationStatus === 'GRADUATED') {
      throw new AppError(
        ERROR_CODES.UNAUTHORIZED,
        'Graduated students cannot access project feed',
      );
    }

    // STEP 1: Get all active projects (via CORE service)
    const allProjects = await this.projectsService.findAll({
      status: 'ACTIVE',
      visibility: 'PUBLIC',
    });

    // STEP 2: STUDENT-SPECIFIC filtering
    const eligibleProjects = allProjects.filter((project) =>
      this.isEligibleForStudent(project, skillTags),
    );

    // STEP 3: Enrich with STUDENT-SPECIFIC data
    const enrichedProjects = await Promise.all(
      eligibleProjects.map(async (project) => {
        const matchScore = await this.matchService.calculateMatchScore(
          studentId,
          project.id,
        );

        return {
          id: project.id,
          title: project.title,
          organization: project.organizationName,
          summary: project.summary,
          skills: project.requiredSkills,
          difficulty: project.difficulty,
          matchScore,
          postedAt: project.createdAt.toISOString(),
        };
      }),
    );

    // STEP 4: STUDENT-SPECIFIC sorting (by match score)
    const sorted = enrichedProjects.sort((a, b) => b.matchScore - a.matchScore);

    // STEP 5: Pagination
    return sorted.slice(0, filters.limit || 9);
  }

  /**
   * STUDENT BUSINESS RULE: Check if project is eligible.
   *
   * Rules:
   * - Student must have at least one matching skill
   * - Project must be active
   * - Project must match student's difficulty level (if specified)
   */
  private isEligibleForStudent(
    project: Project,
    studentSkills: string[],
  ): boolean {
    const requiredSkills = project.requiredSkills || [];
    const hasMatchingSkills = requiredSkills.some((skill) =>
      studentSkills.includes(skill),
    );

    return hasMatchingSkills && project.status === 'ACTIVE';
  }

  /**
   * Express interest in a project.
   * STUDENT-SPECIFIC action with validation.
   */
  async expressInterest(projectId: string): Promise<void> {
    const { studentId } = this.contextService.getContext();

    // Validate project exists (via core service)
    const project = await this.projectsService.findById(projectId);

    // Student business rule: Cannot express interest if already on team
    const existingInterest = await this.hasExistingInterest(
      studentId,
      projectId,
    );

    if (existingInterest) {
      throw new AppError(
        ERROR_CODES.DUPLICATE_RESOURCE,
        'Already expressed interest in this project',
      );
    }

    // Core service would handle the actual database operation
    await this.matchService.createInterest(studentId, projectId);
  }
}
```

### 5.2 Domain Service Checklist

Every domain service MUST:

- [ ] Inject core services (NEVER repositories)
- [ ] Use `ContextService` for role-specific context
- [ ] Validate role-specific business rules
- [ ] Orchestrate multiple core services if needed
- [ ] Apply role-specific filtering/enrichment
- [ ] Never duplicate CRUD logic from core
- [ ] Throw `AppError` with role-specific context

### 5.3 Domain Module Structure

```typescript
// src/modules/students/subdomains/project-feed/project-feed.module.ts

@Module({
  imports: [
    ProjectsModule, // ← Import CORE module
    ProjectMatchModule, // ← Import other CORE modules as needed
    ContextModule,
  ],
  providers: [ProjectFeedService],
  resolvers: [ProjectFeedResolver],
  exports: [ProjectFeedService],
})
export class ProjectFeedModule {}

// Parent module aggregates subdomains
// src/modules/students/students.module.ts

@Module({
  imports: [
    DatabaseModule,
    ContextModule,
    // Import core modules
    ProjectsModule,
    TeamsModule,
    ExperiencesModule,
    // Import subdomains
    DashboardModule,
    ProjectFeedModule,
    BookmarksModule,
    InboxModule,
  ],
  providers: [StudentsService],
  exports: [StudentsService],
})
export class StudentsModule {}
```

---

## 6. Multi-Tenancy Implementation

### 6.1 Context-Based Isolation

**Rule**: Every database query MUST filter by `universityId`.

**Pattern**:

```typescript
// ✅ CORRECT: Tenant-aware query
async findAll(): Promise<Entity[]> {
  const { universityId } = this.contextService.getContext();

  return this.db.db
    .select()
    .from(table)
    .where(eq(table.universityId, universityId)); // ← Always filter
}

// ❌ WRONG: Missing tenant filter (data leak!)
async findAll(): Promise<Entity[]> {
  return this.db.db
    .select()
    .from(table); // Exposes all universities' data
}
```

### 6.2 Context Population

Context is auto-populated by `ContextModule` from JWT:

```typescript
// core/decorators/current-user.decorator.ts
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user; // Populated by JwtAuthGuard
  },
);

// ContextModule middleware extracts tenant info
@Injectable()
export class ContextMiddleware implements NestMiddleware {
  constructor(private contextService: ContextService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const user = req.user; // From JWT

    this.contextService.setContext({
      userId: user.id,
      role: user.role,
      universityId: user.universityId, // ← From user record
      studentId: user.studentId,
      supervisorId: user.supervisorId,
      organizationId: user.organizationId,
    });

    next();
  }
}
```

### 6.3 Foreign Key Constraints

All entities MUST have `universityId`:

```typescript
// models/project.model.ts
export const projects = pgTable('projects', {
  id: uuid('id').primaryKey(),
  universityId: uuid('university_id')
    .references(() => universities.id, { onDelete: 'cascade' })
    .notNull(), // ← REQUIRED for tenant isolation

  // ... other fields
});
```

### 6.4 Cross-Tenant Access Prevention

```typescript
/**
 * Prevents Student A from accessing Student B's data.
 * Even within same university.
 */
async getStudentDashboard(requestedStudentId: string): Promise<Dashboard> {
  const { studentId, universityId } = this.contextService.getContext();

  // Authorization: Students can only access their own data
  if (studentId !== requestedStudentId) {
    throw new AppError(
      ERROR_CODES.UNAUTHORIZED,
      'Cannot access another student\'s dashboard',
      { requestedStudentId, authenticatedStudentId: studentId }
    );
  }

  // Tenant validation happens in core service
  return this.dashboardService.getDashboardData();
}
```

---

## 7. Service Injection & Dependencies

### 7.1 Dependency Flow

```markdown
Domain Service
├─→ Core Service A (Injected)
├─→ Core Service B (Injected)
└─→ Context Service (Injected)

Core Service
├─→ Database Service (Injected)
├─→ Context Service (Injected)
└─→ Other Core Services (Injected, if needed)
```

**Rules**:

- Core services CAN inject other core services
- Domain services MUST inject core services
- Domain services NEVER inject repositories directly
- Core services NEVER inject domain services

### 7.2 Import Chain

```typescript
// ✅ CORRECT: Domain → Core
@Module({
  imports: [ProjectsModule], // Core module
  providers: [ProjectFeedService],
})
export class ProjectFeedModule {}

// ❌ WRONG: Core → Domain (circular dependency)
@Module({
  imports: [ProjectFeedModule], // Domain module
  providers: [ProjectsService],
})
export class ProjectsModule {}
```

### 7.3 Handling Circular Dependencies

If two core services need each other, use `forwardRef()`:

```typescript
// projects/projects.module.ts
@Module({
  imports: [forwardRef(() => TeamsModule)],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}

// teams/teams.module.ts
@Module({
  imports: [forwardRef(() => ProjectsModule)],
  providers: [TeamsService],
  exports: [TeamsService],
})
export class TeamsModule {}
```

**But prefer refactoring**: Extract shared logic into a third service.

---

## 8. Dos and Don'ts

### 8.1 Core Modules

| ✅ DO                                       | ❌ DON'T                                     |
| ------------------------------------------- | -------------------------------------------- |
| Filter all queries by `universityId`        | Skip tenant filtering "just this once"       |
| Implement pure CRUD operations              | Add role-specific logic (student/supervisor) |
| Export service for domain consumption       | Export repository or database service        |
| Use `ContextService` for tenant info        | Access `process.env` or global state         |
| Throw `AppError` with proper codes          | Return `null` or swallow errors              |
| Validate tenant ownership on update/delete  | Trust input IDs without validation           |
| Use transactions for multi-table operations | Execute separate queries without transaction |
| Include `createdBy` and `updatedAt`         | Skip audit fields                            |

### 8.2 Domain Modules

| ✅ DO                                       | ❌ DON'T                                              |
| ------------------------------------------- | ----------------------------------------------------- |
| Inject core services                        | Import repositories or database service               |
| Apply role-specific filtering               | Duplicate CRUD logic from core                        |
| Orchestrate multiple core services          | Mix concerns (e.g., project + billing in one service) |
| Validate role-specific rules                | Skip authorization checks                             |
| Enrich data with role-specific calculations | Modify core service responses directly                |
| Use DTOs for input/output contracts         | Return raw database entities                          |
| Handle role-specific errors                 | Let errors bubble without context                     |

### 8.3 Multi-Tenancy

| ✅ DO                                | ❌ DON'T                                  |
| ------------------------------------ | ----------------------------------------- |
| Filter every query by `universityId` | Trust client-provided `universityId`      |
| Use `ContextService` for tenant info | Pass `universityId` as parameter          |
| Add `universityId` to all entities   | Create tenant-agnostic entities           |
| Validate cross-tenant access         | Assume same university = same permissions |
| Test with multiple universities      | Test only with single university          |
| Index `universityId` columns         | Skip indexes on tenant keys               |

### 8.4 Testing

| ✅ DO                                    | ❌ DON'T                              |
| ---------------------------------------- | ------------------------------------- |
| Mock core services in domain tests       | Mock repositories in domain tests     |
| Test tenant isolation (cross-university) | Skip multi-tenant test cases          |
| Test authorization (cross-user)          | Assume authentication = authorization |
| Use test fixtures for context            | Hard-code user IDs in tests           |
| Test error scenarios                     | Only test happy paths                 |

---

## 9. Decision Trees

### 9.1 Where Does This Logic Belong?

```markdown
Is the logic CRUD-related?
├─ YES: Core service
└─ NO: Is it role-specific?
├─ YES: Domain service
└─ NO: Is it cross-cutting?
├─ YES: Shared utility (error/, notification/)
└─ NO: Re-evaluate (might be business logic for core)
```

### 9.2 Do I Need a New Core Module?

```markdown
Do multiple user types interact with this entity?
├─ YES: Does it have its own database table?
│ ├─ YES: Create core module
│ └─ NO: Add to existing core service
└─ NO: Is it specific to one role?
└─ YES: Create domain subdomain
```

### 9.3 Should I Inject Core or Create New?

```markdown
Does this logic involve database operations?
├─ YES: Is there an existing core service for this entity?
│ ├─ YES: Inject core service
│ └─ NO: Create new core module first
└─ NO: Is it orchestration of multiple entities?
├─ YES: Domain service (inject multiple core services)
└─ NO: Utility function (shared/)
```

---

## 10. Common Patterns Library

### 10.1 Tenant-Aware Batch Query

```typescript
// Core service pattern for domain batch queries
async findByStudentIds(studentIds: string[]): Promise<Student[]> {
  const { universityId } = this.contextService.getContext();

  return this.db.db
    .select()
    .from(students)
    .where(
      and(
        inArray(students.id, studentIds),
        eq(students.universityId, universityId)
      )
    );
}
```

### 10.2 Transactional Multi-Entity Operation

```typescript
// Core service pattern for complex operations
async transferProjectOwnership(
  projectId: string,
  newClientId: string,
): Promise<void> {
  const { universityId } = this.contextService.getContext();

  await this.db.db.transaction(async (tx) => {
    // Validate tenant ownership
    const [project] = await tx
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.id, projectId),
          eq(projects.universityId, universityId)
        )
      );

    if (!project) {
      throw new AppError(ERROR_CODES.RESOURCE_NOT_FOUND, 'Project not found');
    }

    // Update ownership
    await tx
      .update(projects)
      .set({ clientId: newClientId })
      .where(eq(projects.id, projectId));

    // Log audit trail
    await tx.insert(auditLogs).values({
      action: 'TRANSFER_OWNERSHIP',
      entityType: 'PROJECT',
      entityId: projectId,
      universityId,
      performedBy: this.contextService.getUserId(),
    });
  });
}
```

### 10.3 Domain Orchestration with Error Handling

```typescript
// Domain service pattern for multi-service orchestration
async getDashboardData(): Promise<StudentDashboard> {
  const { studentId, universityId } = this.contextService.getContext();

  try {
    // Parallel fetch with individual error handling
    const [tasks, projects, experiences, teams] = await Promise.allSettled([
      this.projectsService.findStudentTasks(studentId, universityId),
      this.projectsService.findStudentProjects(studentId, universityId),
      this.experiencesService.findStudentExperiences(studentId, universityId),
      this.teamsService.findStudentTeams(studentId, universityId),
    ]);

    return {
      tasks: tasks.status === 'fulfilled' ? tasks.value : [],
      projects: projects.status === 'fulfilled' ? projects.value : [],
      experiences: experiences.status === 'fulfilled' ? experiences.value : [],
      teams: teams.status === 'fulfilled' ? teams.value : [],
    };
  } catch (error) {
    throw new AppError(
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      'Failed to load dashboard data',
      { studentId, universityId, originalError: error.message }
    );
  }
}
```

### 10.4 Role-Specific Authorization Check

```typescript
// Domain service pattern for authorization
async updateProject(projectId: string, dto: UpdateProjectDto): Promise<Project> {
  const { userId, role, universityId } = this.contextService.getContext();

  // Fetch project (tenant-validated by core service)
  const project = await this.projectsService.findById(projectId);

  // Role-specific authorization
  const canEdit =
    (role === 'client' && project.clientId === userId) ||
    (role === 'supervisor' && project.supervisorId === userId) ||
    role === 'university';

  if (!canEdit) {
    throw new AppError(
      ERROR_CODES.UNAUTHORIZED,
      'You do not have permission to edit this project',
      { projectId, userId, role }
    );
  }

  // Delegate to core service for actual update
  return this.projectsService.update(projectId, dto);
}
```

### 10.5 Pagination Pattern

```typescript
// Core service pattern for cursor-based pagination
interface PaginationInput {
  limit?: number;
  cursor?: string; // Last item ID from previous page
}

async findAllPaginated(
  filters: ProjectFilters,
  pagination: PaginationInput,
): Promise<{ data: Project[]; nextCursor: string | null }> {
  const { universityId } = this.contextService.getContext();
  const limit = pagination.limit || 10;

  const query = this.db.db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.universityId, universityId),
        pagination.cursor ? gt(projects.id, pagination.cursor) : undefined
      )
    )
    .orderBy(projects.createdAt)
    .limit(limit + 1); // Fetch one extra to determine if there's more

  const results = await query;
  const hasMore = results.length > limit;
  const data = hasMore ? results.slice(0, limit) : results;
  const nextCursor = hasMore ? data[data.length - 1].id : null;

  return { data, nextCursor };
}
```

### 10.6 Data Enrichment Pattern

```typescript
// Domain service pattern for enriching core data
async enrichProjectsWithMatchScores(
  projects: Project[]
): Promise<EnrichedProject[]> {
  const { studentId } = this.contextService.getContext();

  return Promise.all(
    projects.map(async (project) => {
      const matchScore = await this.matchService.calculateMatchScore(
        studentId,
        project.id
      );

      const bookmarked = await this.bookmarkService.isBookmarked(
        studentId,
        project.id
      );

      return {
        ...project,
        matchScore,
        bookmarked,
        // Domain-specific computed fields
        isEligible: this.checkEligibility(project, studentId),
        daysRemaining: this.calculateDaysRemaining(project.deadline),
      };
    })
  );
}
```

---

## 11. Quick Reference

### 11.1 When Building a New Feature

#### **Step 1: Identify Entity Type**

- [ ] Is this a new data entity? → Create core module
- [ ] Is this a role-specific view? → Create domain subdomain

#### **Step 2: Create Core Module (if needed)**

```bash
nest g module modules/{entity}
nest g service modules/{entity}
nest g resolver modules/{entity}
```

#### **Step 3: Implement Core CRUD**

- [ ] Add tenant filtering to all queries
- [ ] Implement findAll, findById, create, update, delete
- [ ] Export service in module

#### **Step 4: Create Domain Subdomain**

```bash
mkdir -p src/modules/{role}/subdomains/{feature}
```

#### **Step 5: Implement Domain Logic**

- [ ] Inject core services
- [ ] Add role-specific filtering
- [ ] Implement orchestration logic
- [ ] Add authorization checks

#### **Step 6: Write Tests**

- [ ] Unit tests for core service (mock database)
- [ ] Unit tests for domain service (mock core services)
- [ ] Integration tests for tenant isolation
- [ ] Integration tests for authorization

### 11.2 Checklist Before PR

Core Module:

- [ ] All queries filter by `universityId`
- [ ] Service exported in module
- [ ] DTOs have class-validator decorators
- [ ] Entities have timestamps (createdAt, updatedAt)
- [ ] Foreign keys use `uuid()` type
- [ ] Error codes from ERROR_CODES constant
- [ ] README.md explains module purpose

Domain Module:

- [ ] Injects core services (not repositories)
- [ ] Role-specific authorization implemented
- [ ] Error handling with proper context
- [ ] GraphQL entities/resolvers documented
- [ ] Tests cover tenant isolation
- [ ] Tests cover cross-user authorization

---

## 12. Migration Guide

### 12.1 Refactoring Existing Code

**Scenario**: You have a monolithic `ProjectsService` with role-specific logic mixed in.

#### **Step 1: Extract Core Logic**

```typescript
// OLD: projects.service.ts (1000+ lines)
@Injectable()
export class ProjectsService {
  // CRUD + student logic + supervisor logic + client logic
}

// NEW: projects/projects.service.ts (Core only)
@Injectable()
export class ProjectsService {
  async findAll() {
    /* Pure CRUD */
  }
  async findById() {
    /* Pure CRUD */
  }
  async create() {
    /* Pure CRUD */
  }
}
```

#### **Step 2: Move Student Logic to Domain**

```typescript
// NEW: students/subdomains/project-feed/project-feed.service.ts
@Injectable()
export class ProjectFeedService {
  constructor(private projectsService: ProjectsService) {}

  async getProjectFeed() {
    const projects = await this.projectsService.findAll();
    // Student-specific filtering and enrichment
  }
}
```

#### **Step 3: Move Supervisor Logic to Domain**

```typescript
// NEW: supervisors/subdomains/project-management/project-management.service.ts
@Injectable()
export class ProjectManagementService {
  constructor(private projectsService: ProjectsService) {}

  async getSupervisorProjects() {
    const projects = await this.projectsService.findAll();
    // Supervisor-specific filtering and enrichment
  }
}
```

#### **Step 4: Update Imports**

```typescript
// OLD
@Module({
  imports: [ProjectsModule],
  providers: [SomeService], // Used mixed ProjectsService
})

// NEW
@Module({
  imports: [
    ProjectsModule,     // Core module
    ProjectFeedModule,  // Student domain
  ],
  providers: [SomeService],
})
```

---

## 13. Testing Strategy

### 13.1 Core Service Tests

```typescript
describe('ProjectsService', () => {
  let service: ProjectsService;
  let mockDb: jest.Mocked<DatabaseService>;
  let mockContext: jest.Mocked<ContextService>;

  beforeEach(() => {
    // Mock context with fixed university
    mockContext.getContext.mockReturnValue({
      universityId: 'university-1',
      userId: 'user-1',
      role: 'student',
    });
  });

  describe('findAll', () => {
    it('should filter by universityId from context', async () => {
      await service.findAll();

      expect(mockDb.db.select).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.arrayContaining([{ universityId: 'university-1' }]),
        }),
      );
    });

    it('should not return projects from other universities', async () => {
      // Test tenant isolation
      const result = await service.findAll();

      result.forEach((project) => {
        expect(project.universityId).toBe('university-1');
      });
    });
  });
});
```

### 13.2 Domain Service Tests

```typescript
describe('ProjectFeedService', () => {
  let service: ProjectFeedService;
  let mockProjectsService: jest.Mocked<ProjectsService>;
  let mockContext: jest.Mocked<ContextService>;

  beforeEach(() => {
    mockContext.getContext.mockReturnValue({
      studentId: 'student-1',
      universityId: 'university-1',
      skillTags: ['React', 'Node.js'],
    });
  });

  describe('getProjectFeed', () => {
    it('should call core service and enrich with match scores', async () => {
      mockProjectsService.findAll.mockResolvedValue([mockProject]);

      const result = await service.getProjectFeed({});

      expect(mockProjectsService.findAll).toHaveBeenCalled();
      expect(result[0]).toHaveProperty('matchScore');
    });

    it('should filter out projects student is not eligible for', async () => {
      const projects = [
        { id: '1', requiredSkills: ['React'] }, // Eligible
        { id: '2', requiredSkills: ['Python'] }, // Not eligible
      ];

      mockProjectsService.findAll.mockResolvedValue(projects);

      const result = await service.getProjectFeed({});

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });
  });
});
```

---

## 14. Common Pitfalls

### 14.1 Anti-Pattern: Bypassing Core Services

```typescript
// ❌ WRONG: Domain service accessing repository directly
@Injectable()
export class ProjectFeedService {
  constructor(@Inject('PROJECT_REPOSITORY') private repo: ProjectRepository) {}

  async getProjects() {
    return this.repo.find(); // Bypasses tenant filtering!
  }
}

// ✅ CORRECT: Use core service
@Injectable()
export class ProjectFeedService {
  constructor(private projectsService: ProjectsService) {}

  async getProjects() {
    return this.projectsService.findAll(); // Tenant-safe!
  }
}
```

### 14.2 Anti-Pattern: Missing Tenant Filter

```typescript
// ❌ WRONG: Forgot universityId filter
async findAll(): Promise<Project[]> {
  return this.db.db
    .select()
    .from(projects)
    .where(eq(projects.status, 'ACTIVE')); // Data leak!
}

// ✅ CORRECT: Always filter by university
async findAll(): Promise<Project[]> {
  const { universityId } = this.contextService.getContext();

  return this.db.db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.universityId, universityId),
        eq(projects.status, 'ACTIVE')
      )
    );
}
```

### 14.3 Anti-Pattern: Role Logic in Core

```typescript
// ❌ WRONG: Student-specific logic in core service
@Injectable()
export class ProjectsService {
  async findForStudent(studentId: string): Promise<Project[]> {
    const projects = await this.findAll();
    return projects.filter((p) => this.isEligibleForStudent(p, studentId));
  }
}

// ✅ CORRECT: Move to domain service
@Injectable()
export class ProjectFeedService {
  constructor(private projectsService: ProjectsService) {}

  async getProjectFeed(): Promise<Project[]> {
    const projects = await this.projectsService.findAll();
    return projects.filter((p) => this.isEligibleForStudent(p));
  }
}
```

---

## 15. Summary

This architecture provides:

✅ **Clear separation** of concerns (Core vs Domain)  
✅ **Multi-tenant safety** by design (context-based filtering)  
✅ **Scalability** (add new roles without touching core)  
✅ **Testability** (mock core services in domain tests)  
✅ **Maintainability** (know exactly where logic belongs)

**Golden Rules**:

1. Core modules handle data, domains handle presentation
2. Every query filters by `universityId`
3. Domain services inject core services (never repositories)
4. One-way dependency: Domain → Core (never Core → Domain)

Follow these patterns, and your architecture will scale gracefully as Gradlinq grows.

---

**Next Steps**: Apply this specification when building student APIs for dashboard, project feed, bookmarks, experiences, and inbox.
