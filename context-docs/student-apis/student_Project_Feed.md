# Student Project Feed Business Rules

## 1. Page Intent & Scope

- Enable authenticated students to browse project opportunities curated for them, filter by domains, and inspect relevant details before expressing interest.
- Surface project cards consistent with dashboard suggestions while respecting eligibility constraints defined in the Student Domain brief.

## 2. Access & Context Requirements

- **Authentication**: Validate Appwrite sessionId via `AuthModule`. Invalid sessions return `ERR_3002`.
- **Context**: `ContextModule` must provide `studentId`, `universityId`, `skillTags`, `program`, and `graduationStatus` for filtering eligibility. Missing `studentId` triggers `ERR_3000`.
- **Authorization**: Students may only view projects marked `visibility = PUBLIC` or tied to their university/program. Unauthorized access returns `ERR_5002`.

## 3. Data Retrieval Pattern

- Primary data delivered via GraphQL query to support combined filters and card metadata:

```graphql
query StudentProjectFeed(
  $studentId: ID!
  $filters: ProjectFeedFilterInput
  $pagination: CursorPaginationInput
) {
  studentProjectFeed(
    studentId: $studentId
    filters: $filters
    pagination: $pagination
  ) {
    cards {
      id
      title
      organization
      organizationLogoUrl
      summary
      skills
      difficulty
      category
      postedAt
      matchScore
      timeRemaining
      tags
    }
    filtersMeta {
      availableCategories
      availableSkills
      defaultSort
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

- Resolver enforces `studentId === context.studentId` and supplements `matchScore` using `ProjectMatchService`. Only projects meeting `ProjectEligibility.isEligible = true` appear.

## 4. Header & Controls

### 4.1 Title Bar

- **What should happen**: Display "Discover Projects" with breadcrumbs (`Home > Projects feed`) and match request button (reuse from inbox/dashboard).
- **How**: Breadcrumb data static; button leverages existing REST `POST /projects/{projectId}/matches/{matchId}/accept|decline`.

### 4.2 Search Bar

- **What should happen**: Allow text search across project titles and organizations.
- **How**: GraphQL query `studentProjectFeedSearch(studentId, term)` returning filtered card IDs.
- **Frontend expects**: `{ cardIds: ["proj-1", "proj-2"] }` for client-side highlighting.

### 4.3 Tag Filters (Categories)

- **What should happen**: Category chips (e.g., Cybersecurity, Artificial Intelligence) toggle filter state.
- **How**: Filters update GraphQL call with `filters.categories` array. Server returns only matching projects.
- **Frontend expects**: `filtersMeta.availableCategories` list plus `activeCategories` from state.

### 4.4 Sort Dropdown

- **What should happen**: Provide sorting by `Newest First`, `Oldest First`, `Match Score`, `Deadline Soon`.
- **How**: GraphQL `filters.sort` parameter. Backend sorts using `postedAt`, `matchScore`, or `timeRemaining`.
- **Business rules**:
  - Default sort `DEFAULT` = `Match Score desc` for eligible students; fallback to `Newest First` if no match scores.
  - Sorting by `Deadline Soon` excludes projects without deadlines.

## 5. Project Card Requirements

- **What should happen**: Render cards with logo, organization name, project title, summary snippet, skill tags, difficulty badge (`Rookie`, `Intermediate`, `Advanced`), posted timestamp, and relative deadline indicator.
- **How**: GraphQL card data fields.
- **Frontend expects**:

```json
{
  "id": "proj-uuid",
  "title": "Sustainable Energy Dashboard Development",
  "organization": "Google Nigeria",
  "organizationLogoUrl": "https://cdn.gradlinq.com/logos/google.png",
  "summary": "Mrkt360 is seeking to expand its client base by identifying...",
  "skills": ["UX Design", "Figma", "Design System"],
  "difficulty": "INTERMEDIATE",
  "category": "Artificial Intelligence",
  "tags": ["Placeholder", "+3"],
  "matchScore": 0.85,
  "postedAt": "2025-09-21T00:00:00Z",
  "timeRemaining": "P4M"
}
```

- **Business rules**:
  - `matchScore` displayed only if computed; hide for ineligible projects.
  - Difficulty derived from project metadata; enforce allowed values `ROOKIE`, `INTERMEDIATE`, `ADVANCED`.
  - `timeRemaining` uses ISO8601 duration; front end converts to display (e.g., "4 months").

## 6. Project Detail Drawer/Page (Inline Overlay Shown)

- **What should happen**: When card clicked, open overlay with tabs `Project overview`, `About company`, `Main contact`, `Learners`, `Expected outcomes & deliverables`, `Additional resources`, and `Recommended projects`.
- **How**:
  - GraphQL `studentProjectFeed.projectDetail(projectId, studentId)` returns nested data matching sections.
  - `Recommended projects` uses same card schema limited to 3 items.
- **Frontend expects**:

```json
{
  "project": {
    "id": "proj-uuid",
    "title": "Sustainable Energy Dashboard Development",
    "organization": "Google Nigeria",
    "overview": "The cornerstone of success...",
    "learners": [
      { "label": "Team lead", "level": "Yes" },
      { "label": "Skill level", "level": "Intermediate" }
    ],
    "outcomes": ["Website launch", "Data insights"],
    "deliverables": ["Project report", "Prototype"],
    "resources": ["Research briefs", "Mentor sessions"],
    "contacts": [
      { "name": "Jepson David", "role": "Lead", "email": "jepson@gradlinq.com" }
    ],
    "company": {
      "name": "Google Nigeria",
      "location": "Lagos, Nigeria",
      "overview": "The company provides..."
    },
    "recommended": [
      /* card schema */
    ]
  }
}
```

- **Business rules**:
  - Only students with `ProjectEligibility.isEligible = true` can view full detail overlay. Others receive truncated view (title, summary) with `ERR_5000` on attempt to access restricted tabs.
  - "Express Interest" button available when supervisor messaging permission allows; action uses REST `POST /projects/{projectId}/interest`.
  - Opening overlay should log audit entry with `correlationId` via `ContextService`.

## 7. Actions & Mutations

- **Express Interest**: `POST /projects/{projectId}/interest` body `{ studentId }`. Validations: student not already on project, within allowed active interest limit (3 concurrently); failure returns `ERR_5001` or `ERR_4002`.
- **Bookmark/Save Project**: (implied from brief) Provide `POST /students/{studentId}/bookmarks` body `{ projectId }`. Remove via `DELETE .../bookmarks/{projectId}`.
- **Share Project**: Trigger `POST /projects/{projectId}/share` sending notification to selected supervisor/team (if implemented). If not yet built, respond `501` for unsupported.

## 8. Frontend Data Contracts & Limits

- Pagination: Cursor-based; default page size 9 cards (3 columns x 3 rows). `pageInfo.hasNextPage` toggles "Load more".
- Text fields sanitized via `ErrorModule` to prevent injection.
- All enums uppercase strings.
- `skills` array limited to 6 tags; `tags` may include aggregated `+3` count representing overflow.
- `postedAt` expressed in ISO8601; front end converts to relative "Posted 3d ago".

## 9. Business Constraints & Rules

- Students with `graduationStatus = GRADUATED` can browse but Express Interest returns `ERR_5002`.
- Projects flagged `confidential = true` require supervisor approval before detail view; backend checks `StudentSupervisorRelation`.
- Category filters display only categories present in dataset for eligible projects.
- Recommended projects exclude the current project; sorted by `matchScore desc`.
- Error responses follow `ErrorModule` schema with `correlationId`.
- Real-time updates: New project matches or status changes trigger `NotificationModule` `NotificationType.UPDATE` targeted to `studentId`.

## 10. Empty States & Feedback

- When no projects match filters, API returns empty `cards` array and `counts.total = 0`; front end renders empty-state card with guidance text provided by CMS.
- Express Interest success emits `NotificationType.SUCCESS` to student and `NotificationType.UPDATE` to supervisor.

## 11. Dependencies & Navigation

- Sidebar navigation reused from `student_user_dashboard.md`.
- "View all" on Recommended section routes to `/projects/recommended` using same GraphQL query with `filters.source = "RECOMMENDED"`.
- Breadcrumb links to `Home` (dashboard) use existing routing; no backend change.
