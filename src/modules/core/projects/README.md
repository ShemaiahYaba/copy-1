# Projects Module

Production-grade projects management for NestJS using Drizzle ORM + GraphQL. Includes client project publishing, student discovery feed, and shared integrations with Auth, Context, Notification, and Error modules. All reads/writes are tenant-aware via `universityId`.

## 📋 Table of Contents

- [✨ Features](#-features)
- [🏗️ Architecture](#️-architecture)
- [🗄️ Database Schema](#️-database-schema)
- [🎛️ Enums](#️-enums)
- [🧩 DTOs](#-dtos)
- [🧭 GraphQL API](#-graphql-api)
- [📌 Workflows](#-workflows)
- [🧠 Business Rules (Student Feed)](#-business-rules-student-feed)
- [🔒 Auth & Guards](#-auth--guards)
- [⚙️ Setup](#️-setup)
- [🧪 Testing](#-testing)
- [🚧 Roadmap / TODO](#-roadmap--todo)

---

## ✨ Features

- Client project lifecycle: create, update, approve, publish, delete.
- Categorization, skills, difficulty, visibility, confidentiality, and metadata.
- Cursor-based student discovery feed with search, filters, and category/skill meta.
- Feed search endpoint for client-side highlighting.
- Project detail fields for cards and drawer overlays (organization, contacts, outcomes, resources).
- Notification hooks for key events (create, update, publish, delete, assign).
- Type-safe DTO validation and enum mappings.

---

## 🏗️ Architecture

```bash
projects/
├── dto/                 # GraphQL input DTOs (create, update, filters, feed)
├── entities/            # GraphQL output types (Project, card, feed meta, page info)
├── models/              # Drizzle schema & enums
├── projects.resolver.ts # GraphQL resolvers
└── projects.service.ts  # Business logic & persistence
```

Dependencies:

- DatabaseModule (Drizzle)
- ContextModule (current user)
- NotificationModule (events)
- Auth guards (JwtAuthGuard, RolesGuard)

---

## 🗄️ Database Schema

Table: `projects`

- Ownership: `clientId`, `createdBy`
- Tenant: `universityId`
- Basics: `title`, `description`, `organization`, `organizationLogoUrl`
- Skills: `requiredSkills[]`, `preferredSkills[]`, `experienceLevel`
- Difficulty: `difficulty` (`ROOKIE|INTERMEDIATE|ADVANCED`)
- Expectations: `objectives`, `deliverables`, `learnerRequirements[] {label,level}`, `expectedOutcomes[]`, `additionalResources[]`, `contactPersons[] {name,role,email}`
- Timeline: `duration (weeks)`, `startDate`, `deadline`, `isFlexibleTimeline`
- Capacity: `teamSize`, `maxApplicants`
- Status: `status`, `approvalStatus`, `approvedBy/At`
- Classification: `category`, `tags[]`, `industry`
- Assignment: `assignedTeamId`, `assignedAt`
- Visibility: `isPublished`, `visibility` (`PUBLIC|UNIVERSITY_RESTRICTED`), `confidential`
- Location/Comp: `isRemote`, `location`, `budget`, `compensationType`
- Metrics: `viewCount`, `applicationCount`, `bookmarkCount`
- Timestamps: `publishedAt`, `completedAt`, `cancelledAt`, `createdAt`, `updatedAt`

Indexes exist on client, status, category, published, assigned, createdAt.

---

## 🎛️ Enums

- `project_status`: draft | published | in_progress | completed | cancelled
- `project_approval_status`: pending | approved | rejected
- `project_category`: web_development | mobile_development | data_science | machine_learning | design | marketing | research | consulting | other
- `project_difficulty`: ROOKIE | INTERMEDIATE | ADVANCED
- `project_visibility`: PUBLIC | UNIVERSITY_RESTRICTED

---

## 🧩 DTOs

- `CreateProjectDto`: full project authoring with validation, length checks, enums, nested contacts/learner requirements.
- `UpdateProjectDto`: partial updates + status override + assignedTeamId.
- `FilterProjectsDto`: page/limit, search, status/approval/category, skills/tags, remote/published/available, sort fields.
- `ProjectFeedFilterInput`: search, categories[], skills[], sort (MATCH_SCORE|NEWEST_FIRST|OLDEST_FIRST|DEADLINE_SOON).
- `CursorPaginationInput`: cursor, limit (default 9).

---

## 🧭 GraphQL API

Queries:

- `projects(filters: FilterProjectsDto!): PaginatedProjectsResponse`
- `project(id: ID!): ProjectEntity`
- `studentProjectFeed(studentId: ID!, filters?: ProjectFeedFilterInput, pagination?: CursorPaginationInput): StudentProjectFeedResponse`
- `studentProjectFeedSearch(studentId: ID!, term: String!): StudentProjectFeedSearchResult`

Mutations (client role):

- `createProject(input: CreateProjectDto!): ProjectEntity`
- `updateProject(id: ID!, input: UpdateProjectDto!): ProjectEntity`
- `deleteProject(id: ID!): Success`
- `publishProject(id: ID!): ProjectEntity`
- `approveProject(id: ID!): ProjectEntity` (supervisor/university TODO guard)
- `assignTeam(projectId: ID!, teamId: ID!): ProjectEntity`

Key response types:

- `ProjectEntity`: full project fields
- `ProjectCardEntity`: id, title, organization/logo, summary, skills, difficulty, category, tags (with +N overflow), postedAt, timeRemaining, matchScore (placeholder)
- `ProjectFiltersMetaEntity`: availableCategories, availableSkills, defaultSort
- `ProjectPageInfo`: hasNextPage, endCursor

Pagination:

- Admin/list: page/limit with totals.
- Student feed: cursor-based (`createdAt`), limit+1 pattern, `endCursor` + `hasNextPage`.

---

## 📌 Workflows

- Create Project
  1. Authenticated client
  2. Insert as draft + pending approval
  3. Notification: success created

- Approve & Publish
  1. Approve sets `approvalStatus=approved`, `approvedBy/At`
  2. Publish sets `status=published`, `isPublished=true`, `publishedAt`
  3. Notifications on each step

- Update Project
  - Ownership check against `createdBy`
  - Partial update; enum coercion for category/status/difficulty/visibility

- Delete Project
  - Ownership check, blocked if assigned to team

- Student Feed
  - Filters: search (title/org/desc), categories, skills (JSON contains), sort options
  - Only published + approved
  - Cursor pagination by createdAt
  - Filters meta computed from filtered dataset
  - Search endpoint returns cardIds for highlighting
  - Eligibility/matchScore: TODO integrate ProjectMatchService / eligibility rules

---

## 🧠 Business Rules (Student Feed)

- Access: authenticated students; visibility PUBLIC or university-restricted (future guard).
- Sorting: default MATCH_SCORE (placeholder), supports Newest, Oldest, Deadline Soon (requires deadline).
- Cards: logo, organization, title, summary snippet, skills (max 6), difficulty badge, tags with overflow “+N”, postedAt, ISO duration timeRemaining.
- Detail drawer (future): overview, learners, outcomes, deliverables, resources, contacts, company, recommended projects (same card schema, exclude current).
- Eligibility (future): hide/limit details when not eligible; confidential projects may require supervisor approval.
- Pagination: cursor with limit default 9; endCursor/hasNextPage drives “Load more”.
- Empty state: returns empty cards with counts=0 (rendered by frontend).

---

## 🔒 Auth & Guards

- All mutations require `JwtAuthGuard` + `RolesGuard` with role checks (client for authoring; supervisor/university approval TBD).
- Student feed/search guarded by Jwt + Roles(student); service also checks context user.
- Tenant isolation: every query uses `universityId` from `ContextService`.
- Errors thrown via `AppError` with `ERROR_CODES` (e.g., UNAUTHORIZED, INSUFFICIENT_PERMISSIONS, RESOURCE_NOT_FOUND, OPERATION_NOT_ALLOWED).

---

## ⚙️ Setup

1. Ensure DatabaseModule, ContextModule, NotificationModule are registered.
1. Run migrations after schema changes (Drizzle).
1. Add module import:

```typescript
import { ProjectsModule } from '@modules/core/projects/projects.module';
@Module({
  imports: [DatabaseModule, ContextModule, NotificationModule, ProjectsModule],
})
export class AppModule {}
```

1. Environment: database URL configured; Auth/Context/Notification envs already set by core modules.

---

## 🧪 Testing

- Unit tests: add resolver/service tests mocking DatabaseService + Context/Notification.
- Focus areas: filtering/search, pagination boundaries (limit+1), ownership checks, status transitions (approve/publish), guard interactions.
- Example pseudo:
  - feed returns <= limit and sets hasNextPage
  - deadline sort excludes null deadlines
  - skills filter uses JSON contains

---

## 🚧 Roadmap / TODO

- Integrate ProjectMatchService for `matchScore` and default sort.
- Enforce university/program visibility + confidentiality guard.
- Eligibility gating for detail view and actions (express interest, bookmark, share).
- Add recommended projects computation.
- Add REST endpoints for interest/bookmark/share if needed by frontend.
- Add comprehensive e2e coverage for student feed flows.
