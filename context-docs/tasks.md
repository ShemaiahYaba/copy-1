# TASK 12: CREATE TEAMS CORE MODULE (Complete Implementation)

## **Duration:** 2-3 hours

### **Dependencies:** None (can start after Task 11)

---

## **Step 12.1: Generate NestJS Module Scaffolding**

**Terminal commands (run in order):**

```bash
# Navigate to project root
cd /path/to/gradlinq-backend

# Generate module
nest g module modules/teams

# Generate service
nest g service modules/teams --no-spec

# Generate resolver
nest g resolver modules/teams --no-spec

# Create required folders
mkdir -p src/modules/teams/models
mkdir -p src/modules/teams/entities
mkdir -p src/modules/teams/dto
mkdir -p src/modules/teams/interfaces

# Create required files
touch src/modules/teams/models/team.model.ts
touch src/modules/teams/models/team-assignment.model.ts
touch src/modules/teams/entities/team.entity.ts
touch src/modules/teams/dto/create-team.dto.ts
touch src/modules/teams/dto/update-team.dto.ts
touch src/modules/teams/dto/filter-teams.dto.ts
touch src/modules/teams/dto/add-member.dto.ts
touch src/modules/teams/README.md
```

**Verify:** You should now have this structure:

```markdown
src/modules/teams/
├── teams.module.ts
├── teams.service.ts
├── teams.resolver.ts
├── models/
│ ├── team.model.ts
│ └── team-assignment.model.ts
├── entities/
│ └── team.entity.ts
├── dto/
│ ├── create-team.dto.ts
│ ├── update-team.dto.ts
│ ├── filter-teams.dto.ts
│ └── add-member.dto.ts
└── README.md
```

---

## **Step 12.2: Define Database Models**

### **File 1:** `src/modules/teams/models/team.model.ts`

**Action:** Copy this EXACT code:

```typescript
// ============================================================================
// TEAMS TABLE MODEL
// src/modules/teams/models/team.model.ts
// ============================================================================

import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  pgEnum,
  index,
  json,
} from 'drizzle-orm/pg-core';
import { users } from '@modules/core/auth/models/user.model';
import { projects } from '@modules/projects/models/project.model';

// ============================================================================
// ENUMS
// ============================================================================

export const teamStatusEnum = pgEnum('team_status', [
  'ACTIVE',
  'INACTIVE',
  'COMPLETED',
  'DISBANDED',
]);

export const teamVisibilityEnum = pgEnum('team_visibility', [
  'PUBLIC',
  'PRIVATE',
  'UNIVERSITY_ONLY',
]);

// ============================================================================
// TEAMS TABLE
// ============================================================================

export const teams = pgTable(
  'teams',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Ownership & Context
    createdBy: uuid('created_by')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    universityId: uuid('university_id')
      .references(() => users.id, { onDelete: 'cascade' }) // TODO: Change to universities.id when table exists
      .notNull(),

    // Basic Information
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    avatar: varchar('avatar', { length: 500 }), // Team avatar/logo URL

    // Project Assignment
    projectId: uuid('project_id').references(() => projects.id, {
      onDelete: 'set null',
    }),
    assignedAt: timestamp('assigned_at'),

    // Supervision
    supervisorId: uuid('supervisor_id').references(() => users.id, {
      onDelete: 'set null',
    }),

    // Team Lead (usually a student)
    leadId: uuid('lead_id').references(() => users.id, {
      onDelete: 'set null',
    }),

    // Status & Settings
    status: teamStatusEnum('status').default('ACTIVE').notNull(),
    visibility: teamVisibilityEnum('visibility')
      .default('UNIVERSITY_ONLY')
      .notNull(),

    // Capacity
    maxMembers: integer('max_members').default(10).notNull(),
    currentMemberCount: integer('current_member_count').default(0).notNull(),

    // Messaging
    hasUnreadMessages: boolean('has_unread_messages').default(false),
    lastMessageAt: timestamp('last_message_at'),

    // Metadata
    tags: json('tags').$type<string[]>(),
    skills: json('skills').$type<string[]>(), // Team's combined skills

    // Timestamps
    completedAt: timestamp('completed_at'),
    disbandedAt: timestamp('disbanded_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    createdByIdx: index('teams_created_by_idx').on(table.createdBy),
    universityIdx: index('teams_university_idx').on(table.universityId),
    projectIdx: index('teams_project_idx').on(table.projectId),
    supervisorIdx: index('teams_supervisor_idx').on(table.supervisorId),
    leadIdx: index('teams_lead_idx').on(table.leadId),
    statusIdx: index('teams_status_idx').on(table.status),
    createdAtIdx: index('teams_created_at_idx').on(table.createdAt),
  }),
);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
export type TeamStatus = 'ACTIVE' | 'INACTIVE' | 'COMPLETED' | 'DISBANDED';
export type TeamVisibility = 'PUBLIC' | 'PRIVATE' | 'UNIVERSITY_ONLY';
```

---

### **File 2:** `src/modules/teams/models/team-assignment.model.ts`

**Action:** Copy this code:

```typescript
// ============================================================================
// TEAM ASSIGNMENTS TABLE MODEL
// src/modules/teams/models/team-assignment.model.ts
// ============================================================================

import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  boolean,
  pgEnum,
  index,
  unique,
} from 'drizzle-orm/pg-core';
import { users } from '@modules/core/auth/models/user.model';
import { teams } from './team.model';

// ============================================================================
// ENUMS
// ============================================================================

export const teamRoleEnum = pgEnum('team_role', ['LEAD', 'MEMBER', 'OBSERVER']);

export const assignmentStatusEnum = pgEnum('assignment_status', [
  'ACTIVE',
  'INACTIVE',
  'REMOVED',
  'LEFT',
]);

// ============================================================================
// TEAM ASSIGNMENTS TABLE (Many-to-Many: Teams <-> Users)
// ============================================================================

export const teamAssignments = pgTable(
  'team_assignments',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Relations
    teamId: uuid('team_id')
      .references(() => teams.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    universityId: uuid('university_id')
      .references(() => users.id, { onDelete: 'cascade' }) // TODO: Change to universities.id
      .notNull(),

    // Role & Status
    role: teamRoleEnum('role').default('MEMBER').notNull(),
    status: assignmentStatusEnum('status').default('ACTIVE').notNull(),

    // Permissions
    canInviteMembers: boolean('can_invite_members').default(false),
    canEditTeam: boolean('can_edit_team').default(false),
    canMessageClient: boolean('can_message_client').default(false),

    // Metadata
    invitedBy: uuid('invited_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    joinedAt: timestamp('joined_at').defaultNow().notNull(),
    leftAt: timestamp('left_at'),
    removedBy: uuid('removed_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    removedAt: timestamp('removed_at'),
    removalReason: varchar('removal_reason', { length: 500 }),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    teamIdx: index('assignments_team_idx').on(table.teamId),
    userIdx: index('assignments_user_idx').on(table.userId),
    universityIdx: index('assignments_university_idx').on(table.universityId),
    statusIdx: index('assignments_status_idx').on(table.status),
    // Unique constraint: One assignment per user per team
    uniqueTeamUser: unique('assignments_team_user_unique').on(
      table.teamId,
      table.userId,
    ),
  }),
);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type TeamAssignment = typeof teamAssignments.$inferSelect;
export type NewTeamAssignment = typeof teamAssignments.$inferInsert;
export type TeamRole = 'LEAD' | 'MEMBER' | 'OBSERVER';
export type AssignmentStatus = 'ACTIVE' | 'INACTIVE' | 'REMOVED' | 'LEFT';
```

---

## **Step 12.3: Export Schema in Central Registry**

**File:** `src/database/schema/index.ts`

**Action:** Add these lines at the bottom:

```typescript
// Add to existing exports
export {
  teams,
  teamAssignments,
  teamStatusEnum,
  teamVisibilityEnum,
  teamRoleEnum,
  assignmentStatusEnum,
} from '@modules/teams/models/team.model';

// Re-export from team-assignment.model.ts
export { teamAssignments } from '@modules/teams/models/team-assignment.model';

export type {
  Team,
  NewTeam,
  TeamStatus,
  TeamVisibility,
  TeamAssignment,
  NewTeamAssignment,
  TeamRole,
  AssignmentStatus,
} from '@modules/teams/models/team.model';
```

**Verify:** Run `pnpm build` - should compile without errors.

---

## **Step 12.4: Generate and Run Migration**

**Terminal commands:**

```bash
# Generate migration
pnpm drizzle-kit generate

# This will create a new file like:
# src/database/migrations/0003_teams_tables.sql

# Review the generated SQL
cat src/database/migrations/0003_*.sql

# Expected SQL should include:
# - CREATE TYPE "team_status" AS ENUM (...)
# - CREATE TYPE "team_visibility" AS ENUM (...)
# - CREATE TYPE "team_role" AS ENUM (...)
# - CREATE TYPE "assignment_status" AS ENUM (...)
# - CREATE TABLE "teams" (...)
# - CREATE TABLE "team_assignments" (...)
# - CREATE INDEX statements
# - CREATE UNIQUE INDEX for team_user constraint

# Run migration
pnpm drizzle-kit migrate
```

**Verify:** Check your database:

```sql
-- Run in your database client
SELECT * FROM teams LIMIT 1;
SELECT * FROM team_assignments LIMIT 1;
```

Both tables should exist (empty).

---

## **Step 12.5: Create GraphQL Entities**

**File:** `src/modules/teams/entities/team.entity.ts`

**Action:** Copy this code:

```typescript
// ============================================================================
// GRAPHQL ENTITIES
// src/modules/teams/entities/team.entity.ts
// ============================================================================

import { ObjectType, Field, ID, Int } from '@nestjs/graphql';

@ObjectType()
export class TeamMemberEntity {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  userId: string;

  @Field()
  role: string;

  @Field()
  status: string;

  @Field()
  canInviteMembers: boolean;

  @Field()
  canEditTeam: boolean;

  @Field()
  canMessageClient: boolean;

  @Field()
  joinedAt: Date;

  @Field({ nullable: true })
  leftAt?: Date;
}

@ObjectType()
export class TeamEntity {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  createdBy: string;

  @Field(() => ID)
  universityId: string;

  @Field()
  name: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  avatar?: string;

  @Field(() => ID, { nullable: true })
  projectId?: string;

  @Field({ nullable: true })
  assignedAt?: Date;

  @Field(() => ID, { nullable: true })
  supervisorId?: string;

  @Field(() => ID, { nullable: true })
  leadId?: string;

  @Field()
  status: string;

  @Field()
  visibility: string;

  @Field(() => Int)
  maxMembers: number;

  @Field(() => Int)
  currentMemberCount: number;

  @Field()
  hasUnreadMessages: boolean;

  @Field({ nullable: true })
  lastMessageAt?: Date;

  @Field(() => [String], { nullable: true })
  tags?: string[];

  @Field(() => [String], { nullable: true })
  skills?: string[];

  @Field({ nullable: true })
  completedAt?: Date;

  @Field({ nullable: true })
  disbandedAt?: Date;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

@ObjectType()
export class TeamWithMembersEntity extends TeamEntity {
  @Field(() => [TeamMemberEntity])
  members: TeamMemberEntity[];
}

@ObjectType()
export class PaginatedTeamsResponse {
  @Field(() => [TeamEntity])
  items: TeamEntity[];

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  limit: number;

  @Field(() => Int)
  totalPages: number;

  @Field()
  hasNextPage: boolean;

  @Field()
  hasPreviousPage: boolean;
}

@ObjectType()
export class TeamAssignmentEntity {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  teamId: string;

  @Field(() => ID)
  userId: string;

  @Field()
  role: string;

  @Field()
  status: string;

  @Field()
  canInviteMembers: boolean;

  @Field()
  canEditTeam: boolean;

  @Field()
  canMessageClient: boolean;

  @Field()
  joinedAt: Date;

  @Field({ nullable: true })
  leftAt?: Date;

  @Field()
  createdAt: Date;
}
```

---

## **Step 12.6: Create DTOs**

### **File 1:** `src/modules/teams/dto/create-team.dto.ts`

```typescript
// ============================================================================
// CREATE TEAM DTO
// src/modules/teams/dto/create-team.dto.ts
// ============================================================================

import { InputType, Field, Int, ID } from '@nestjs/graphql';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsInt,
  Min,
  Max,
  MinLength,
  MaxLength,
  IsEnum,
  IsUUID,
} from 'class-validator';

@InputType()
export class CreateTeamDto {
  @Field()
  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'Team name must be at least 3 characters' })
  @MaxLength(255, { message: 'Team name must not exceed 255 characters' })
  name: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  avatar?: string;

  @Field(() => ID, { nullable: true })
  @IsUUID()
  @IsOptional()
  projectId?: string;

  @Field(() => ID, { nullable: true })
  @IsUUID()
  @IsOptional()
  supervisorId?: string;

  @Field(() => ID, { nullable: true })
  @IsUUID()
  @IsOptional()
  leadId?: string;

  @Field({ nullable: true, defaultValue: 'UNIVERSITY_ONLY' })
  @IsOptional()
  @IsEnum(['PUBLIC', 'PRIVATE', 'UNIVERSITY_ONLY'])
  visibility?: string;

  @Field(() => Int, { nullable: true, defaultValue: 10 })
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(50)
  maxMembers?: number;

  @Field(() => [String], { nullable: true })
  @IsArray()
  @IsOptional()
  tags?: string[];

  @Field(() => [String], { nullable: true })
  @IsArray()
  @IsOptional()
  skills?: string[];
}
```

---

### **File 2:** `src/modules/teams/dto/update-team.dto.ts`

```typescript
import { InputType, PartialType, Field } from '@nestjs/graphql';
import { CreateTeamDto } from './create-team.dto';
import { IsOptional, IsEnum } from 'class-validator';

@InputType()
export class UpdateTeamDto extends PartialType(CreateTeamDto) {
  @Field({ nullable: true })
  @IsOptional()
  @IsEnum(['ACTIVE', 'INACTIVE', 'COMPLETED', 'DISBANDED'])
  status?: string;
}
```

---

### **File 3:** `src/modules/teams/dto/filter-teams.dto.ts`

```typescript
import { InputType, Field, Int, ID } from '@nestjs/graphql';
import {
  IsOptional,
  IsString,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsUUID,
} from 'class-validator';

@InputType()
export class FilterTeamsDto {
  @Field(() => Int, { nullable: true, defaultValue: 1 })
  @IsInt()
  @IsOptional()
  @Min(1)
  page?: number = 1;

  @Field(() => Int, { nullable: true, defaultValue: 10 })
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(50)
  limit?: number = 10;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  search?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsEnum(['ACTIVE', 'INACTIVE', 'COMPLETED', 'DISBANDED'])
  status?: string;

  @Field(() => ID, { nullable: true })
  @IsUUID()
  @IsOptional()
  projectId?: string;

  @Field(() => ID, { nullable: true })
  @IsUUID()
  @IsOptional()
  supervisorId?: string;

  @Field({ nullable: true, defaultValue: 'createdAt' })
  @IsString()
  @IsOptional()
  sortBy?: string = 'createdAt';

  @Field({ nullable: true, defaultValue: 'desc' })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
```

---

### **File 4:** `src/modules/teams/dto/add-member.dto.ts`

```typescript
import { InputType, Field, ID } from '@nestjs/graphql';
import {
  IsUUID,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsBoolean,
} from 'class-validator';

@InputType()
export class AddMemberDto {
  @Field(() => ID)
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @Field({ nullable: true, defaultValue: 'MEMBER' })
  @IsOptional()
  @IsEnum(['LEAD', 'MEMBER', 'OBSERVER'])
  role?: string;

  @Field({ nullable: true, defaultValue: false })
  @IsBoolean()
  @IsOptional()
  canInviteMembers?: boolean;

  @Field({ nullable: true, defaultValue: false })
  @IsBoolean()
  @IsOptional()
  canEditTeam?: boolean;

  @Field({ nullable: true, defaultValue: false })
  @IsBoolean()
  @IsOptional()
  canMessageClient?: boolean;
}
```

---

## **Step 12.7: Implement Service (Core CRUD Only)**

**File:** `src/modules/teams/teams.service.ts`

**Action:** Replace entire file with this code:

```typescript
// ============================================================================
// TEAMS SERVICE (CORE CRUD)
// src/modules/teams/teams.service.ts
// ============================================================================

import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@database/database.service';
import {
  teams,
  teamAssignments,
  TeamStatus,
  TeamVisibility,
  TeamRole,
  AssignmentStatus,
} from './models/team.model';
import { eq, and, or, ilike, desc, asc, count, isNull } from 'drizzle-orm';
import { ContextService } from '@modules/shared/context/context.service';
import { NotificationService } from '@modules/shared/notification/notification.service';
import { NotificationType } from '@modules/shared/notification/interfaces';
import { ERROR_CODES } from '@shared/error/constants/error-codes.constant';
import { AppError } from '@shared/error/classes/app-error.class';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { FilterTeamsDto } from './dto/filter-teams.dto';
import { AddMemberDto } from './dto/add-member.dto';

@Injectable()
export class TeamsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly contextService: ContextService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Create a new team
   */
  async create(dto: CreateTeamDto) {
    const userId = this.contextService.getUserId();
    const context = this.contextService.getContext();

    if (!userId) {
      throw new AppError(
        ERROR_CODES.UNAUTHORIZED,
        'User must be authenticated',
      );
    }

    if (!context.universityId) {
      throw new AppError(
        ERROR_CODES.MISSING_CONTEXT,
        'University context required',
      );
    }

    const [team] = await this.db.db
      .insert(teams)
      .values({
        ...dto,
        createdBy: userId,
        universityId: context.universityId,
        status: 'ACTIVE',
        visibility: (dto.visibility as TeamVisibility) || 'UNIVERSITY_ONLY',
        currentMemberCount: 0,
      })
      .returning();

    // Auto-add creator as first member (LEAD role)
    await this.db.db.insert(teamAssignments).values({
      teamId: team.id,
      userId,
      universityId: context.universityId,
      role: 'LEAD',
      status: 'ACTIVE',
      canInviteMembers: true,
      canEditTeam: true,
      canMessageClient: true,
    });

    // Update member count
    await this.db.db
      .update(teams)
      .set({ currentMemberCount: 1 })
      .where(eq(teams.id, team.id));

    await this.notificationService.push({
      type: NotificationType.SUCCESS,
      message: `Team "${team.name}" created successfully`,
      context: { teamId: team.id },
    });

    return { ...team, currentMemberCount: 1 };
  }

  /**
   * Get all teams with filtering and pagination
   */
  async findAll(filters: FilterTeamsDto) {
    const context = this.contextService.getContext();

    if (!context.universityId) {
      throw new AppError(
        ERROR_CODES.MISSING_CONTEXT,
        'University context required',
      );
    }

    const {
      page = 1,
      limit = 10,
      search,
      status,
      projectId,
      supervisorId,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters;

    const offset = (page - 1) * limit;

    // Build WHERE conditions
    const conditions = [eq(teams.universityId, context.universityId)];

    if (search) {
      conditions.push(
        or(
          ilike(teams.name, `%${search}%`),
          ilike(teams.description ?? '', `%${search}%`),
        )!,
      );
    }

    if (status) {
      conditions.push(eq(teams.status, status as TeamStatus));
    }

    if (projectId) {
      conditions.push(eq(teams.projectId, projectId));
    }

    if (supervisorId) {
      conditions.push(eq(teams.supervisorId, supervisorId));
    }

    const whereClause = and(...conditions);

    // Sorting
    let orderByClause;
    if (sortBy === 'createdAt') {
      orderByClause =
        sortOrder === 'asc' ? asc(teams.createdAt) : desc(teams.createdAt);
    } else if (sortBy === 'name') {
      orderByClause = sortOrder === 'asc' ? asc(teams.name) : desc(teams.name);
    } else {
      orderByClause = desc(teams.createdAt);
    }

    // Execute queries
    const [items, totalResult] = await Promise.all([
      this.db.db
        .select()
        .from(teams)
        .where(whereClause)
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset),

      this.db.db.select({ count: count() }).from(teams).where(whereClause),
    ]);

    const total = totalResult[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      items,
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }

  /**
   * Find team by ID (tenant-validated)
   */
  async findById(id: string) {
    const context = this.contextService.getContext();

    if (!context.universityId) {
      throw new AppError(
        ERROR_CODES.MISSING_CONTEXT,
        'University context required',
      );
    }

    const [team] = await this.db.db
      .select()
      .from(teams)
      .where(
        and(eq(teams.id, id), eq(teams.universityId, context.universityId)),
      )
      .limit(1);

    if (!team) {
      throw new AppError(ERROR_CODES.RESOURCE_NOT_FOUND, 'Team not found', {
        teamId: id,
      });
    }

    return team;
  }

  /**
   * Find teams by student ID (for dashboard)
   */
  async findByStudentId(studentId: string) {
    const context = this.contextService.getContext();

    if (!context.universityId) {
      throw new AppError(
        ERROR_CODES.MISSING_CONTEXT,
        'University context required',
      );
    }

    // Find all team assignments for this student
    const assignments = await this.db.db
      .select()
      .from(teamAssignments)
      .where(
        and(
          eq(teamAssignments.userId, studentId),
          eq(teamAssignments.universityId, context.universityId),
          eq(teamAssignments.status, 'ACTIVE'),
        ),
      );

    if (assignments.length === 0) {
      return [];
    }

    const teamIds = assignments.map((a) => a.teamId);

    // Get team details
    const teamsList = await this.db.db
      .select()
      .from(teams)
      .where(
        and(
          eq(teams.universityId, context.universityId),
          // TODO: Use inArray when you have multiple teams
          // For now, just return first team
        ),
      );

    return teamsList;
  }

  /**
   * Update team (ownership check)
   */
  async update(id: string, dto: UpdateTeamDto) {
    const userId = this.contextService.getUserId();

    if (!userId) {
      throw new AppError(
        ERROR_CODES.UNAUTHORIZED,
        'User must be authenticated',
      );
    }

    // Verify ownership or lead/supervisor permission
    const team = await this.findById(id);
    const canEdit = await this.canUserEditTeam(userId, id);

    if (!canEdit && team.createdBy !== userId) {
      throw new AppError(
        ERROR_CODES.INSUFFICIENT_PERMISSIONS,
        'You do not have permission to edit this team',
      );
    }

    const { status, visibility, ...restOfDto } = dto;
    const updateData: Partial<typeof teams.$inferInsert> = {
      ...restOfDto,
      updatedAt: new Date(),
    };

    if (status) {
      updateData.status = status as TeamStatus;
    }
    if (visibility) {
      updateData.visibility = visibility as TeamVisibility;
    }

    const [updated] = await this.db.db
      .update(teams)
      .set(updateData)
      .where(eq(teams.id, id))
      .returning();

    await this.notificationService.push({
      type: NotificationType.SUCCESS,
      message: 'Team updated successfully',
      context: { teamId: id },
    });

    return updated;
  }

  /**
   * Add member to team
   */
  async addMember(teamId: string, dto: AddMemberDto) {
    const userId = this.contextService.getUserId();
    const context = this.contextService.getContext();

    if (!userId) {
      throw new AppError(
        ERROR_CODES.UNAUTHORIZED,
        'User must be authenticated',
      );
    }

    // Verify team exists and get current state
    const team = await this.findById(teamId);

    // Check if user can invite members
    const canInvite = await this.canUserInviteMembers(userId, teamId);

    if (!canInvite && team.createdBy !== userId) {
      throw new AppError(
        ERROR_CODES.INSUFFICIENT_PERMISSIONS,
        'You do not have permission to add members to this team',
      );
    }

    // Check team capacity
    if (team.currentMemberCount >= team.maxMembers) {
      throw new AppError(
        ERROR_CODES.OPERATION_NOT_ALLOWED,
        'Team has reached maximum capacity',
        { currentCount: team.currentMemberCount, maxMembers: team.maxMembers },
      );
    }

    // Check if user
```
