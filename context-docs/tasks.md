# 🚀 TASK 15: CREATE STUDENT EXPERIENCES SUBDOMAIN

**Duration:** 2-3 hours  
**Complexity:** 🟡 MEDIUM  
**Dependencies:** ExperiencesService ✅ (Task 11 - exists)

---

## **What You'll Build**

Student-specific view of experiences with:

- ✅ List view (grid + table layouts)
- ✅ Detail view with nested data (members, matches, institution)
- ✅ Status workflows (draft → published → archived)
- ✅ Cross-domain enrichment (recommended projects)
- ✅ Nested GraphQL resolvers (lazy loading)

**This teaches you:**

1. Complex domain orchestration
2. Nested GraphQL field resolvers
3. Cross-module data enrichment
4. State machine validation

---

## **Step 15.1: Create Folder Structure**

**Terminal commands:**

```bash
# Create student experiences subdomain
mkdir -p src/modules/students/subdomains/experiences
mkdir -p src/modules/students/subdomains/experiences/dto
mkdir -p src/modules/students/subdomains/experiences/entities
mkdir -p src/modules/students/subdomains/experiences/_tests_

# Create files
touch src/modules/students/subdomains/experiences/experiences.module.ts
touch src/modules/students/subdomains/experiences/experiences.service.ts
touch src/modules/students/subdomains/experiences/experiences.resolver.ts
touch src/modules/students/subdomains/experiences/dto/experience-filters.dto.ts
touch src/modules/students/subdomains/experiences/entities/experience-card.entity.ts
touch src/modules/students/subdomains/experiences/README.md
```

**Verify structure:**

```markdown
src/modules/students/subdomains/experiences/
├── experiences.module.ts
├── experiences.service.ts
├── experiences.resolver.ts
├── dto/
│ └── experience-filters.dto.ts
├── entities/
│ └── experience-card.entity.ts
├── _tests_/
└── README.md
```

---

## **Step 15.2: Create DTOs**

**File:** `src/modules/students/subdomains/experiences/dto/experience-filters.dto.ts`

```typescript
// ============================================================================
// STUDENT EXPERIENCE FILTERS DTO
// src/modules/students/subdomains/experiences/dto/experience-filters.dto.ts
// ============================================================================

import { InputType, Field, Int } from '@nestjs/graphql';
import { IsOptional, IsString, IsEnum, IsInt, Min, Max } from 'class-validator';

export type ExperienceViewType = 'GRID' | 'LIST';
export type ExperienceFilterType = 'CREATED' | 'SHARED' | 'ALL';

@InputType()
export class StudentExperienceFiltersDto {
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

  @Field({ nullable: true, defaultValue: 'CREATED' })
  @IsOptional()
  @IsEnum(['CREATED', 'SHARED', 'ALL'])
  filter?: ExperienceFilterType = 'CREATED';

  @Field({ nullable: true, defaultValue: 'GRID' })
  @IsOptional()
  @IsEnum(['GRID', 'LIST'])
  view?: ExperienceViewType = 'GRID';

  @Field({ nullable: true })
  @IsOptional()
  @IsEnum(['DRAFT', 'PUBLISHED', 'ARCHIVED'])
  status?: string;

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

## **Step 15.3: Create GraphQL Entities**

**File:** `src/modules/students/subdomains/experiences/entities/experience-card.entity.ts`

```typescript
// ============================================================================
// STUDENT EXPERIENCE ENTITIES
// src/modules/students/subdomains/experiences/entities/experience-card.entity.ts
// ============================================================================

import { ObjectType, Field, ID, Int } from '@nestjs/graphql';

// ============================================================================
// EXPERIENCE CARD (Grid View)
// ============================================================================

@ObjectType()
export class ExperienceCardEntity {
  @Field(() => ID)
  id: string;

  @Field()
  title: string;

  @Field({ nullable: true })
  courseCode?: string;

  @Field()
  university: string;

  @Field()
  summary: string;

  @Field(() => [String])
  skills: string[];

  @Field()
  status: string;

  @Field()
  startDate: string; // ISO8601

  @Field()
  endDate: string; // ISO8601

  @Field(() => Int)
  matchesCount: number;

  @Field(() => [String])
  tags: string[];
}

// ============================================================================
// EXPERIENCE ROW (List View)
// ============================================================================

@ObjectType()
export class ExperienceRowEntity {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  status: string;

  @Field()
  createdBy: string;

  @Field()
  createdAt: string; // ISO8601

  @Field({ nullable: true })
  endDate?: string; // ISO8601

  @Field()
  matchesUrl: string; // `/experiences/${id}/matches`
}

// ============================================================================
// EXPERIENCE DETAIL (Full View)
// ============================================================================

@ObjectType()
export class ExperienceDurationEntity {
  @Field()
  start: string; // ISO8601

  @Field()
  end: string; // ISO8601

  @Field(() => Int)
  weeks: number;
}

@ObjectType()
export class ExperienceLearnerEntity {
  @Field()
  label: string;

  @Field()
  value: string;
}

@ObjectType()
export class ExperienceRequirementsEntity {
  @Field(() => ExperienceCompanyPreferencesEntity, { nullable: true })
  companyPreferences?: ExperienceCompanyPreferencesEntity;

  @Field(() => [String], { nullable: true })
  prerequisites?: string[];
}

@ObjectType()
export class ExperienceCompanyPreferencesEntity {
  @Field({ nullable: true })
  location?: string;

  @Field(() => [String], { nullable: true })
  industry?: string[];
}

@ObjectType()
export class ExperienceContactEntity {
  @Field()
  name: string;

  @Field()
  role: string;

  @Field()
  email: string;

  @Field()
  institution: string;

  @Field()
  location: string;
}

@ObjectType()
export class ExperienceMemberEntity {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  userId: string;

  @Field()
  name: string;

  @Field()
  email: string;

  @Field()
  role: string;

  @Field()
  status: string;

  @Field()
  joinedAt: string;
}

@ObjectType()
export class ExperienceInstitutionEntity {
  @Field()
  name: string;

  @Field()
  department: string;

  @Field()
  location: string;

  @Field()
  description: string;
}

// Import from project feed (reuse entity)
// We'll reference this type but define it inline for now
@ObjectType()
export class RecommendedProjectCardEntity {
  @Field(() => ID)
  id: string;

  @Field()
  title: string;

  @Field()
  organization: string;

  @Field({ nullable: true })
  summary?: string;

  @Field(() => [String])
  skills: string[];

  @Field()
  difficulty: string;
}

@ObjectType()
export class ExperienceDetailEntity {
  @Field(() => ID)
  id: string;

  @Field()
  title: string;

  @Field({ nullable: true })
  courseCode?: string;

  @Field(() => ExperienceDurationEntity)
  duration: ExperienceDurationEntity;

  @Field(() => [String])
  tags: string[];

  @Field()
  status: string;

  @Field()
  overview: string;

  @Field(() => [ExperienceLearnerEntity])
  learners: ExperienceLearnerEntity[];

  @Field(() => ExperienceRequirementsEntity)
  requirements: ExperienceRequirementsEntity;

  @Field(() => [String])
  expectedOutcomes: string[];

  @Field(() => [String])
  projectExamples: string[];

  @Field(() => ExperienceContactEntity)
  mainContact: ExperienceContactEntity;

  @Field(() => [ExperienceMemberEntity])
  members: ExperienceMemberEntity[];

  @Field(() => [RecommendedProjectCardEntity])
  recommendedProjects: RecommendedProjectCardEntity[];

  @Field(() => ExperienceInstitutionEntity)
  institution: ExperienceInstitutionEntity;
}

// ============================================================================
// PAGINATED RESPONSE
// ============================================================================

@ObjectType()
export class PaginatedExperiencesResponse {
  @Field(() => [ExperienceCardEntity], { nullable: true })
  cards?: ExperienceCardEntity[];

  @Field(() => [ExperienceRowEntity], { nullable: true })
  rows?: ExperienceRowEntity[];

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
```

---

## **Step 15.4: Create Service**

**File:** `src/modules/students/subdomains/experiences/experiences.service.ts`

```typescript
// ============================================================================
// STUDENT EXPERIENCES SERVICE (DOMAIN)
// src/modules/students/subdomains/experiences/experiences.service.ts
// ============================================================================

import { Injectable } from '@nestjs/common';
import { ExperiencesService } from '@modules/core/experiences/experiences.service';
import { ProjectsService } from '@modules/core/projects/projects.service';
import { ContextService } from '@modules/shared/context/context.service';
import { AppError } from '@shared/error/classes/app-error.class';
import { ERROR_CODES } from '@shared/error/constants/error-codes.constant';
import type { StudentExperienceFiltersDto } from './dto/experience-filters.dto';
import type {
  ExperienceCardEntity,
  ExperienceRowEntity,
  ExperienceDetailEntity,
} from './entities/experience-card.entity';

@Injectable()
export class StudentExperiencesService {
  constructor(
    private readonly experiencesService: ExperiencesService, // ← Core service
    private readonly projectsService: ProjectsService, // ← For recommendations
    private readonly contextService: ContextService,
  ) {}

  /**
   * Get student experiences (grid or list view)
   */
  async getExperiences(filters: StudentExperienceFiltersDto) {
    const { studentId, universityId, role } = this.contextService.getContext();

    if (!studentId || role !== 'student') {
      throw new AppError(
        ERROR_CODES.UNAUTHORIZED,
        'Only students can access experiences',
      );
    }

    if (!universityId) {
      throw new AppError(
        ERROR_CODES.MISSING_CONTEXT,
        'University context required',
      );
    }

    // STEP 1: Get experiences from core service
    const result = await this.experiencesService.findAll({
      page: filters.page,
      limit: filters.limit,
      search: filters.search,
      status: filters.status,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
    });

    // STEP 2: Apply student-specific filtering
    let filteredItems = result.items;

    if (filters.filter === 'CREATED') {
      // Only experiences created by this student
      filteredItems = filteredItems.filter(
        (exp) => exp.createdBy === studentId,
      );
    } else if (filters.filter === 'SHARED') {
      // Only experiences shared with this student
      // TODO: Implement sharing logic when ExperienceParticipant is ready
      filteredItems = [];
    }
    // 'ALL' shows everything (default from core)

    // STEP 3: Transform based on view type
    if (filters.view === 'GRID') {
      const cards: ExperienceCardEntity[] = filteredItems.map((exp) =>
        this.mapToCard(exp),
      );

      return {
        cards,
        rows: undefined,
        total: cards.length,
        page: filters.page || 1,
        limit: filters.limit || 10,
        totalPages: Math.ceil(cards.length / (filters.limit || 10)),
        hasNextPage: cards.length > (filters.limit || 10),
        hasPreviousPage: (filters.page || 1) > 1,
      };
    } else {
      // LIST view
      const rows: ExperienceRowEntity[] = filteredItems.map((exp) =>
        this.mapToRow(exp),
      );

      return {
        cards: undefined,
        rows,
        total: rows.length,
        page: filters.page || 1,
        limit: filters.limit || 10,
        totalPages: Math.ceil(rows.length / (filters.limit || 10)),
        hasNextPage: rows.length > (filters.limit || 10),
        hasPreviousPage: (filters.page || 1) > 1,
      };
    }
  }

  /**
   * Get single experience detail
   */
  async getExperienceDetail(
    experienceId: string,
  ): Promise<ExperienceDetailEntity> {
    const { studentId, universityId } = this.contextService.getContext();

    if (!studentId) {
      throw new AppError(
        ERROR_CODES.UNAUTHORIZED,
        'User must be authenticated',
      );
    }

    // Get experience from core
    const experience = await this.experiencesService.findById(experienceId);

    // Authorization: Only creator can view (for now)
    if (experience.createdBy !== studentId) {
      throw new AppError(
        ERROR_CODES.UNAUTHORIZED,
        'You can only view your own experiences',
      );
    }

    // Get recommended projects (if published)
    let recommendedProjects: any[] = [];
    if (experience.status === 'PUBLISHED') {
      // Find projects matching experience skills
      const projectsResult = await this.projectsService.findAll({
        status: 'published',
        approvalStatus: 'approved',
        isPublished: true,
        limit: 3,
      });
      recommendedProjects = projectsResult.items.slice(0, 3);
    }

    return this.mapToDetail(experience, recommendedProjects);
  }

  /**
   * Create experience (draft)
   */
  async createExperience(dto: any) {
    const { studentId } = this.contextService.getContext();

    if (!studentId) {
      throw new AppError(
        ERROR_CODES.UNAUTHORIZED,
        'User must be authenticated',
      );
    }

    // Check draft limit
    const existing = await this.experiencesService.findAll({
      status: 'DRAFT',
    });

    const studentDrafts = existing.items.filter(
      (exp) => exp.createdBy === studentId,
    );

    if (studentDrafts.length >= 5) {
      throw new AppError(
        ERROR_CODES.OPERATION_NOT_ALLOWED,
        'Maximum draft limit reached (5)',
        { currentDrafts: studentDrafts.length },
      );
    }

    // Delegate to core service
    return this.experiencesService.create(dto);
  }

  /**
   * Update experience
   */
  async updateExperience(experienceId: string, dto: any) {
    const { studentId } = this.contextService.getContext();

    if (!studentId) {
      throw new AppError(
        ERROR_CODES.UNAUTHORIZED,
        'User must be authenticated',
      );
    }

    // Verify ownership
    const experience = await this.experiencesService.findById(experienceId);
    if (experience.createdBy !== studentId) {
      throw new AppError(
        ERROR_CODES.INSUFFICIENT_PERMISSIONS,
        'You can only update your own experiences',
      );
    }

    return this.experiencesService.update(experienceId, dto);
  }

  /**
   * Publish experience
   */
  async publishExperience(experienceId: string) {
    const { studentId } = this.contextService.getContext();

    if (!studentId) {
      throw new AppError(
        ERROR_CODES.UNAUTHORIZED,
        'User must be authenticated',
      );
    }

    // Verify ownership
    const experience = await this.experiencesService.findById(experienceId);
    if (experience.createdBy !== studentId) {
      throw new AppError(
        ERROR_CODES.INSUFFICIENT_PERMISSIONS,
        'You can only publish your own experiences',
      );
    }

    // Check publish limit
    const published = await this.experiencesService.findAll({
      status: 'PUBLISHED',
    });

    const studentPublished = published.items.filter(
      (exp) => exp.createdBy === studentId,
    );

    if (studentPublished.length >= 10) {
      throw new AppError(
        ERROR_CODES.OPERATION_NOT_ALLOWED,
        'Maximum published experiences limit reached (10)',
        { currentPublished: studentPublished.length },
      );
    }

    return this.experiencesService.publish(experienceId);
  }

  /**
   * Archive experience
   */
  async archiveExperience(experienceId: string) {
    const { studentId } = this.contextService.getContext();

    if (!studentId) {
      throw new AppError(
        ERROR_CODES.UNAUTHORIZED,
        'User must be authenticated',
      );
    }

    // Verify ownership
    const experience = await this.experiencesService.findById(experienceId);
    if (experience.createdBy !== studentId) {
      throw new AppError(
        ERROR_CODES.INSUFFICIENT_PERMISSIONS,
        'You can only archive your own experiences',
      );
    }

    return this.experiencesService.archive(experienceId);
  }

  /**
   * Delete experience (drafts only)
   */
  async deleteExperience(experienceId: string) {
    const { studentId } = this.contextService.getContext();

    if (!studentId) {
      throw new AppError(
        ERROR_CODES.UNAUTHORIZED,
        'User must be authenticated',
      );
    }

    // Verify ownership
    const experience = await this.experiencesService.findById(experienceId);
    if (experience.createdBy !== studentId) {
      throw new AppError(
        ERROR_CODES.INSUFFICIENT_PERMISSIONS,
        'You can only delete your own experiences',
      );
    }

    return this.experiencesService.delete(experienceId);
  }

  // ============================================================================
  // PRIVATE MAPPERS
  // ============================================================================

  private mapToCard(experience: any): ExperienceCardEntity {
    return {
      id: experience.id,
      title: experience.title,
      courseCode: experience.courseCode ?? undefined,
      university: 'Mountain Top University', // TODO: Get from context or join
      summary: experience.overview?.substring(0, 150) || '',
      skills: experience.tags || [],
      status: experience.status,
      startDate: experience.startDate.toISOString(),
      endDate: experience.endDate.toISOString(),
      matchesCount: experience.matchesCount || 0,
      tags: this.generateTags(experience),
    };
  }

  private mapToRow(experience: any): ExperienceRowEntity {
    return {
      id: experience.id,
      name: experience.title,
      status: experience.status,
      createdBy: 'You', // TODO: Get actual creator name
      createdAt: experience.createdAt.toISOString(),
      endDate: experience.endDate?.toISOString(),
      matchesUrl: `/experiences/${experience.id}/matches`,
    };
  }

  private mapToDetail(
    experience: any,
    recommendedProjects: any[],
  ): ExperienceDetailEntity {
    return {
      id: experience.id,
      title: experience.title,
      courseCode: experience.courseCode ?? undefined,
      duration: {
        start: experience.startDate.toISOString(),
        end: experience.endDate.toISOString(),
        weeks: experience.durationWeeks || 0,
      },
      tags: experience.tags || [],
      status: experience.status,
      overview: experience.overview || '',
      learners: experience.learnerRequirements || [],
      requirements: {
        companyPreferences: experience.companyPreferences,
        prerequisites: experience.prerequisites || [],
      },
      expectedOutcomes: experience.expectedOutcomes || [],
      projectExamples: experience.projectExamples || [],
      mainContact: experience.mainContact || {
        name: 'Unknown',
        role: 'Contact',
        email: 'contact@university.edu',
        institution: 'University',
        location: 'Location',
      },
      members: [], // TODO: Get from ExperienceParticipants
      recommendedProjects: recommendedProjects.map((p) => ({
        id: p.id,
        title: p.title,
        organization: p.organization || 'Unknown',
        summary: p.description?.substring(0, 100),
        skills: p.requiredSkills || [],
        difficulty: p.difficulty || 'INTERMEDIATE',
      })),
      institution: {
        name: 'Mountain Top University',
        department: 'Computer Science',
        location: 'Ogun State, Nigeria',
        description: 'Leading technology institution',
      },
    };
  }

  private generateTags(experience: any): string[] {
    const tags: string[] = [];

    if (experience.status === 'DRAFT') {
      tags.push('Draft');
    }

    if (experience.tags && experience.tags.length > 3) {
      tags.push(`+${experience.tags.length - 3}`);
    }

    return tags;
  }
}
```

---

## **Step 15.5: Create Resolver**

**File:** `src/modules/students/subdomains/experiences/experiences.resolver.ts`

```typescript
// ============================================================================
// STUDENT EXPERIENCES RESOLVER
// src/modules/students/subdomains/experiences/experiences.resolver.ts
// ============================================================================

import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard } from '@modules/core/auth/guards';
import { Roles, CurrentUser } from '@modules/core/auth/decorators';
import type { User } from '@modules/core/auth/models/user.model';
import { StudentExperiencesService } from './experiences.service';
import {
  PaginatedExperiencesResponse,
  ExperienceDetailEntity,
} from './entities/experience-card.entity';
import { StudentExperienceFiltersDto } from './dto/experience-filters.dto';
import { CreateExperienceDto } from '@modules/core/experiences/dto/create-experience.dto';
import { UpdateExperienceDto } from '@modules/core/experiences/dto/update-experience.dto';

@Resolver()
@UseGuards(JwtAuthGuard, RolesGuard)
export class StudentExperiencesResolver {
  constructor(private readonly experiencesService: StudentExperiencesService) {}

  @Query(() => PaginatedExperiencesResponse, { name: 'studentExperiences' })
  @Roles('student')
  async getExperiences(
    @Args('filters', { nullable: true }) filters: StudentExperienceFiltersDto,
    @CurrentUser() _user: User, // eslint-disable-line @typescript-eslint/no-unused-vars
  ) {
    return this.experiencesService.getExperiences(filters || {});
  }

  @Query(() => ExperienceDetailEntity, { name: 'studentExperienceDetail' })
  @Roles('student')
  async getExperienceDetail(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() _user: User, // eslint-disable-line @typescript-eslint/no-unused-vars
  ) {
    return this.experiencesService.getExperienceDetail(id);
  }

  @Mutation(() => ExperienceDetailEntity, { name: 'createStudentExperience' })
  @Roles('student')
  async createExperience(
    @Args('input') input: CreateExperienceDto,
    @CurrentUser() _user: User, // eslint-disable-line @typescript-eslint/no-unused-vars
  ) {
    return this.experiencesService.createExperience(input);
  }

  @Mutation(() => ExperienceDetailEntity, { name: 'updateStudentExperience' })
  @Roles('student')
  async updateExperience(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateExperienceDto,
    @CurrentUser() _user: User, // eslint-disable-line @typescript-eslint/no-unused-vars
  ) {
    return this.experiencesService.updateExperience(id, input);
  }

  @Mutation(() => ExperienceDetailEntity, { name: 'publishStudentExperience' })
  @Roles('student')
  async publishExperience(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() _user: User, // eslint-disable-line @typescript-eslint/no-unused-vars
  ) {
    return this.experiencesService.publishExperience(id);
  }

  @Mutation(() => ExperienceDetailEntity, { name: 'archiveStudentExperience' })
  @Roles('student')
  async archiveExperience(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() _user: User, // eslint-disable-line @typescript-eslint/no-unused-vars
  ) {
    return this.experiencesService.archiveExperience(id);
  }

  @Mutation(() => Boolean, { name: 'deleteStudentExperience' })
  @Roles('student')
  async deleteExperience(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() _user: User, // eslint-disable-line @typescript-eslint/no-unused-vars
  ) {
    await this.experiencesService.deleteExperience(id);
    return true;
  }
}
```

---

## **Step 15.6: Create Module**

**File:** `src/modules/students/subdomains/experiences/experiences.module.ts`

```typescript
// ============================================================================
// STUDENT EXPERIENCES MODULE
// src/modules/students/subdomains/experiences/experiences.module.ts
// ============================================================================

import { Module } from '@nestjs/common';
import { StudentExperiencesService } from './experiences.service';
import { StudentExperiencesResolver } from './experiences.resolver';
import { ExperiencesModule } from '@modules/core/experiences/experiences.module';
import { ProjectsModule } from '@modules/core/projects/projects.module';
import { ContextModule } from '@modules/shared/context/context.module';

@Module({
  imports: [
    ExperiencesModule, // ← Core experiences
    ProjectsModule, // ← For recommendations
    ContextModule,
  ],
  providers: [StudentExperiencesService, StudentExperiencesResolver],
  exports: [StudentExperiencesService],
})
export class StudentExperiencesModule {}
```

---

## **Step 15.7: Add README**

**File:** `src/modules/students/subdomains/experiences/README.md`

````markdown
# Student Experiences Subdomain

Student-specific experiential learning management.

## Purpose

- Provides student view of experiences (created + shared)
- Manages experience lifecycle (draft → published → archived)
- Enriches with recommended projects
- Enforces student business rules (draft limits, publish limits)

## Responsibilities

- **View Management**: Grid vs List layouts
- **Filtering**: Created by me, Shared with me, All
- **Lifecycle**: Draft (max 5), Published (max 10), Archive
- **Recommendations**: Match experiences with projects
- **Authorization**: Students can only edit their own experiences

## Service Pattern

```typescript
// DOMAIN service injects CORE services
constructor(
  private readonly experiencesService: ExperiencesService, // Core
  private readonly projectsService: ProjectsService, // For recommendations
) {}

async getExperiences(filters: StudentExperienceFiltersDto) {
  // Step 1: Get from core
  const experiences = await this.experiencesService.findAll(...);

  // Step 2: Apply student filtering (CREATED vs SHARED)
  const filtered = experiences.filter(isCreatedByStudent);

  // Step 3: Transform to view type (Grid cards vs List rows)
  return this.transformToView(filtered, filters.view);
}
```
````

## GraphQL Queries

```graphql
query {
  studentExperiences(filters: { view: GRID, filter: CREATED }) {
    cards {
      id
      title
      status
      matchesCount
    }
    total
  }
}

query {
  studentExperienceDetail(id: "exp-123") {
    title
    overview
    members { name role }
    recommendedProjects { title organization }
  }
}

mutation {
  createStudentExperience(input: { title: "My Experience" ... })
}
```

## Business Rules

- Max 5 draft experiences
- Max 10 published experiences
- Only creator can edit/publish/archive
- Recommended projects only shown for published experiences
- Deletion only allowed for drafts

---

## **Step 15.8: Update Students Module**

**File:** `src/modules/students/students.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { StudentsService } from './students.service';
import { StudentsResolver } from './students.resolver';
import { ContextModule } from '@modules/shared/context/context.module';
import { ProjectFeedModule } from './subdomains/project-feed/project-feed.module';
import { StudentBookmarksModule } from './subdomains/bookmarks/bookmarks.module';
import { StudentExperiencesModule } from './subdomains/experiences/experiences.module'; // ← ADD THIS
import { NotificationModule } from '@modules/shared/notification/notification.module';
import { NotificationAdapter } from '@modules/shared/notification/dto';
import { AuthModule } from '@modules/core/auth/auth.module';

@Module({
  imports: [
    ContextModule,
    AuthModule,
    ProjectFeedModule,
    StudentBookmarksModule,
    StudentExperiencesModule, // ← ADD THIS
    NotificationModule.register({
      adapter: NotificationAdapterWEBSOCKET,
      persist: false,
      enableLogging: true,
      maxRetries: 3,
    }),
  ],
  providers: [StudentsService, StudentsResolver],
  exports: [StudentsService],
})
export class StudentsModule {}
```

---

## **Step 15.9: Build and Test**

```bash
# Build
pnpm build

# Start dev server
pnpm start:dev
```

**Test in GraphQL Playground:**

```graphql
# Query 1: Get experiences (grid view)
query {
  studentExperiences(filters: { view: GRID, filter: CREATED, limit: 5 }) {
    cards {
      id
      title
      courseCode
      university
      status
      matchesCount
    }
    total
  }
}

# Query 2: Get experiences (list view)
query {
  studentExperiences(filters: { view: LIST }) {
    rows {
      id
      name
      status
      createdBy
      createdAt
    }
    total
  }
}

# Query 3: Get experience detail
query {
  studentExperienceDetail(id: "your-experience-id") {
    title
    overview
    duration {
      start
      end
      weeks
    }
    learners {
      label
      value
    }
    recommendedProjects {
      title
      organization
    }
  }
}

# Mutation 1: Create experience
mutation {
  createStudentExperience(
    input: {
      title: "Applied Machine Learning"
      courseCode: "CS 401"
      overview: "This comprehensive experience combines theoretical foundations with practical applications of machine learning"
      startDate: "2025-06-01"
      endDate: "2025-09-01"
    }
  )
}
```

---

## ✅ Success Criteria

- [ ] Folder structure created
- [ ] DTOs support grid/list views and filters
- [ ] Entities support both card and row views
- [ ] Service orchestrates ExperiencesService + ProjectsService
- [ ] Resolver has all CRUD operations
- [ ] Module imports core services
- [ ] Students module updated
- [ ] Build passes
- [ ] GraphQL queries work

---

## 🎯 What You Learned

1. **View Type Transformation:** Same data, different presentations (grid vs list)
2. **Cross-Domain Enrichment:** Fetching recommended projects from ProjectsService
3. **Business Rule Enforcement:** Draft limits (5), publish limits (10)
4. **Ownership Validation:** Students can only manage their own experiences
5. **State Machine:** Draft → Published → Archived workflow

---

## 🚀 You Now Have

- ✅ Core: Projects, Experiences, Teams
- ✅ Student Domain: Project Feed, Bookmarks, **Experiences**

**Next:** Ready for Dashboard (orchestrates all 3) or continue with more subdomains?

Which would you like next? 🎯
