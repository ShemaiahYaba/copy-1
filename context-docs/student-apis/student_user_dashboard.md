# Student Dashboard Business Rules

## 1. Purpose & Scope

- Provide a personalized operating hub for authenticated student users, surfacing active work, progress signals, and next-best actions immediately after login.
- Aggregate student-specific data from Projects, Tasks, Teams, Experiences, and Notifications without exposing unauthorized resources.

## 2. Access & Context Requirements

- **Authentication**: Session must be validated through `AuthModule` (Appwrite sessionId). Expired or invalid sessions trigger `ERR_3002` via `ErrorModule`.
- **Context loading**: `ContextModule` populates `studentId`, `universityId`, `teamIds`, `role` for subsequent service calls. Missing `studentId` returns `ERR_3000`.
- **Authorization**: Only the student and authorized university supervisors may call dashboard endpoints. Cross-student access returns `ERR_5002`.
- **Notifications link**: WebSocket handshake must pass the same sessionId; failure emits `NotificationType.ERROR` "Unauthorized".

## 3. Data Retrieval Pattern

- Primary fetch uses GraphQL to minimize round-trips:

```graphql
query StudentDashboard($studentId: ID!, $filters: StudentDashboardFilterInput) {
  studentDashboard(studentId: $studentId, filters: $filters) {
    header {
      greeting
      lastLoginAt
    }
    tasks(filter: $filters.taskStatus, limit: 5) {
      id
      title
      projectId
      projectName
      status
      dueAt
      isOverdue
    }
    projects(filter: $filters.projectStatus, limit: 5) {
      id
      name
      companyName
      status
      lastUpdatedAt
      matchScore
    }
    experiences(filter: $filters.experienceStatus, limit: 5) {
      id
      title
      status
      lastEditedAt
    }
    teams(limit: 3) {
      id
      name
      role
      avatarUrls
      unreadThreadCount
    }
    suggestions(limit: 3) {
      projectId
      projectName
      reason
      matchScore
    }
    notifications {
      unreadCount
      latest {
        id
        type
        message
        createdAt
      }
    }
  }
}
```

- GraphQL resolver must enforce `studentId === context.studentId` and hydrate derived fields (`isOverdue`, `matchScore`) via domain services.
- Filters default to `status = ONGOING`. Allow `ALL | ONGOING | COMPLETED | DRAFT` per widget.

## 4. Widget-Level Rules

### 4.1 Header & Global Actions

- **What should happen**: Display student avatar, greeting, and "Find Projects" CTA when the student has eligible skill matches.
- **How**: Greeting uses `ContextModule` timestamp + student profile name. Eligibility derived from `ProjectMatchService` (minimum match score 0.6). CTA disabled if no matches or student flagged `graduationStatus = PENDING`.
- **Endpoints**: GraphQL header query above; CTA links to REST `GET /projects/matches?studentId=...`.
- **Frontend expects**: `{ greeting: string, lastLoginAt: ISO8601, hasMatches: boolean }`.

### 4.2 Search Input

- **What should happen**: Search filters dashboard lists by project or task title.
- **How**: Debounced client call to GraphQL `studentDashboardSearch(term, studentId)` returning IDs grouped by entity type.
- **Endpoints**: `query StudentDashboardSearch(studentId: ID!, term: String!): DashboardSearchResult`.
- **Frontend expects**: Arrays of IDs to cross-filter already-fetched data; no direct result rendering.

### 4.3 My Tasks Module

- **What should happen**: Show up to five tasks with status toggle (All/Ongoing/Completed) and allow inline state updates.
- **How**: Resolver aggregates from `StudentTaskService` using `Project` linkage. Status change requires REST mutation.
- **Endpoints**:
  - GraphQL: `tasks` field in main query.
  - REST: `PATCH /students/{studentId}/tasks/{taskId}` body `{ status: "COMPLETED" | "ONGOING" }`.
- **Frontend expects**:

```json
{
  "id": "task-uuid",
  "title": "Write weekly report",
  "projectId": "proj-123",
  "projectName": "AI Diagnostics",
  "status": "ONGOING",
  "dueAt": "2025-09-25T17:00:00Z",
  "isOverdue": false
}
```

- **Business rules**:
  - Tasks visible only if `assignmentStatus = ACTIVE`.
  - Completing a task triggers `NotificationType.SUCCESS` and refreshes project progress.
  - Overdue tasks emit `NotificationType.UPDATE` when `dueAt < now && status != COMPLETED`.

### 4.4 Projects Module

- **What should happen**: Display ongoing or completed projects with status filter and quick link to detail.
- **How**: `ProjectAssignmentService` returns student assignments with derived `matchScore` (from `ProjectMatch` table). Sorting: ongoing by `lastUpdatedAt desc`, completed by `completedAt desc`.
- **Endpoints**:
  - GraphQL: `projects` field.
  - REST: `POST /projects/{projectId}/interest` (notify supervisor), `POST /projects/{projectId}/weekly-report` (navigates to report workflow).
- **Frontend expects**:

```json
{
  "id": "proj-uuid",
  "name": "AI-Powered Healthcare Diagnostic",
  "companyName": "Healthtech Company Plc",
  "status": "ONGOING",
  "matchScore": 0.82,
  "lastUpdatedAt": "2025-09-22T12:00:00Z"
}
```

- **Business rules**:
  - Students see only projects where `ProjectEligibility.isEligible = true`.
  - `matchScore` must be hidden if supervisor marks project confidential.
  - Trigger error `ERR_5001` if student tries to mark interest on already accepted project.

### 4.5 Experiences Module

- **What should happen**: List portfolio experience drafts/published records with status filter and quick edit.
- **How**: Data from `StudentExperienceService`. Only experiences with `visibility != ARCHIVED` appear.
- **Endpoints**:
  - GraphQL: `experiences` field.
  - REST: `PATCH /students/{studentId}/experiences/{experienceId}` for status updates.
- **Frontend expects**:

```json
{
  "id": "exp-uuid",
  "title": "AI Research Intern",
  "status": "PUBLISHED",
  "lastEditedAt": "2025-09-20T09:00:00Z"
}
```

- **Business rules**:
  - Draft limit: max 5 drafts; exceeding returns `ERR_5003`.
  - Publishing auto-updates `lingoCV` via internal event.

### 4.6 Teams Module

- **What should happen**: Show active team rooms with unread indicators.
- **How**: `TeamAssignmentService` joins `StudentTeamAssignment` and messaging summaries. Unread counts sourced from `Messages` bounded to last 7 days.
- **Endpoints**:
  - GraphQL: `teams` field.
  - REST/WebSocket: `GET /teams/{teamId}/threads?studentId=...` for drill-down; new messages pushed via `/notify` namespace.
- **Frontend expects**:

```json
{
  "id": "team-uuid",
  "name": "team-alpha",
  "role": "LEAD",
  "avatarUrls": ["/avatars/u1.png"],
  "unreadThreadCount": 2
}
```

- **Business rules**:
  - Only teams with `status = ACTIVE` render.
  - Lead role toggles additional CTA ("Message client"), but backend must validate `MessagingPermission.isGranted` before enabling.

### 4.7 Suggestions / Match Requests

- **What should happen**: Highlight up to three recommended projects or match requests needing action.
- **How**: `ProjectMatchService` surfaces highest `SkillMatchScore`. Items flagged `actionRequired = true` if supervisor awaiting response.
- **Endpoints**:
  - GraphQL: `suggestions` field.
  - REST: `POST /projects/{projectId}/matches/{matchId}/accept` or `/decline` for decisions.
- **Frontend expects**:

```json
{
  "projectId": "proj-uuid",
  "projectName": "Diagnostics Research",
  "reason": "Matches React, Python",
  "matchScore": 0.9,
  "actionRequired": true
}
```

- **Business rules**:
  - Declining requires reason; empty reason returns `ERR_2002`.
  - Accepting auto-enrolls student awaiting supervisor confirmation and fires `NotificationType.UPDATE` to supervisor room.

### 4.8 Notifications Pill / Inbox Shortcut

- **What should happen**: Display unread count badge and latest notification preview.
- **How**: `NotificationModule` history API; badge updates through WebSocket `notification` events.
- **Endpoints**:
  - GraphQL: `notifications` field.
  - REST: `PATCH /students/{studentId}/notifications/{notificationId}/read`.
- **Frontend expects**: `{ unreadCount: number, latest: [{ id, type, message, createdAt }] }`.
- **Business rules**:
  - Badge max displays "9+" when count > 9.
  - Notifications older than 30 days excluded unless unread.

### 4.9 Empty States

- **What should happen**: Render instructional empty state cards when lists return zero items.
- **How**: Resolver returns `[]` plus `counts.total`. `counts.total = 0` instructs frontend to show empty-state variant from design system.
- **Endpoints**: GraphQL `tasks.count`, `projects.count`, etc.
- **Frontend expects**: `tasksCount`, `projectsCount`, `experiencesCount`, `teamsCount` integers.

## 5. Mutations & Side-Effects Summary

- **Task status update**: `PATCH /students/{studentId}/tasks/{taskId}`. Emits success notification and recalculates project progress percentage.
- **Project interest**: `POST /projects/{projectId}/interest`. Creates supervisor notification. If duplicate, respond `409 ERR_4002`.
- **Weekly report submission**: `POST /projects/{projectId}/reports` with payload `{ weekEnding: Date, summary: string, blockers: string[], attachments: Attachment[] }`. Val rules: summary min 100 chars.
- **Experience publish/draft toggle**: `PATCH /students/{studentId}/experiences/{experienceId}` body `{ status: "PUBLISHED" | "DRAFT" }` triggers `NotificationType.UPDATE` to student only.
- **Match decision**: `POST /projects/{projectId}/matches/{matchId}/accept` or `/decline`. Accept requires verifying student not already on another team for project; otherwise `ERR_5000`.

## 6. Frontend Data Expectations

- All timestamps ISO8601 UTC.
- Status enums:
  - Tasks: `ONGOING | COMPLETED`.
  - Projects: `ONGOING | COMPLETED | ARCHIVED` (archived filtered out).
  - Experiences: `DRAFT | PUBLISHED`.
  - Teams: `ACTIVE | INACTIVE` (inactive hidden).
- Numeric scores returned as floats 0-1 with two decimal precision.
- Avatar arrays limited to 5 entries per team.

## 7. General Business Rules & Constraints

- Dashboard must load within 1.5s; GraphQL response capped at 50 items per list; provide pagination cursors for "View all" routes.
- Student without active assignments should see suggestions prioritized by `matchScore` and `createdAt desc`.
- Graduation status `GRADUATED` locks new project acceptance; endpoints return `ERR_5002` if attempted.
- Students cannot mark tasks completed if dependent milestone incomplete; backend validates via `ProjectMilestoneService`.
- Error responses must follow `ErrorModule` format with `correlationId` from `ContextModule`.
- Real-time updates (new tasks, team invites, notifications) dispatched through `/notify` namespace; dashboard should reconcile via optimistic updates.
- All list items must include `correlationId` in audit logs for traceability.

## 8. Error & Notification Handling

- Operational errors (validation, business rules) return `NotificationType.ERROR` with actionable copy (e.g., "Supervisor approval required").
- Success actions emit `NotificationType.SUCCESS` with contextual message and `context.studentId`.
- Backend must log errors using `ContextService.getLoggingContext()` to ensure consistent telemetry.

## 9. Dependencies & Follow-up Views

- "View all" links navigate to dedicated routes (`/tasks`, `/projects`, `/experiences`, `/teams`) which reuse the same GraphQL fragments with extended pagination.
- "Find Projects" button should preserve applied filters when transitioning to `discover projects` screen via query params.
- Inbox icon links to `/messages`, leveraging existing message thread APIs (`GET /messages/threads?studentId=...`).
