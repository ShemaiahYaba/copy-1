# Student Bookmarks Page Business Rules

## 1. Page Intent & Scope

- Provide students a dedicated workspace to review and manage saved projects sourced from the project feed or dashboard suggestions.
- Maintain alignment with project eligibility rules while enabling easy navigation back to discovery experiences.

## 2. Access & Context Requirements

- **Authentication**: Validate Appwrite session via `AuthModule`. Invalid sessions return `ERR_3002`.
- **Context**: `ContextModule` must supply `studentId`, `universityId`, and `program`. Missing `studentId` triggers `ERR_3000`.
- **Authorization**: Only the owning student or approved supervisor can view a student’s bookmarks. Cross-student access returns `ERR_5002`.

## 3. Header & Controls

- **What should happen**: Show page title "Bookmarks" with helper text, filter tabs (`Created by me`, `Shared with me`, `All Experiences`), and search bar.
- **How**:
  - Tabs map to GraphQL filter parameters controlling bookmark visibility scope.
  - Search filters by project title or organization using GraphQL search query.
- **Frontend expects**:

```json
{
  "filters": ["CREATED", "SHARED", "ALL"],
  "activeFilter": "CREATED"
}
```

## 4. Bookmarked Project Cards

- **What should happen**: Display project cards identical to dashboard/project feed cards, including organization, summary, skill tags, difficulty badge, posted date, and deadline indicator.
- **How**: GraphQL `studentBookmarks(studentId, filter, pagination)` returns card data referencing `StudentBookmark` entity joined with `Project`.
- **Frontend expects**:

```json
{
  "id": "bookmark-uuid",
  "projectId": "proj-uuid",
  "title": "Project Name",
  "organization": "Google Nigeria",
  "organizationLogoUrl": "https://cdn.gradlinq.com/logos/google.png",
  "summary": "Mrkt360 is seeking to expand its client base...",
  "skills": ["UX Design", "Figma", "Design System"],
  "difficulty": "INTERMEDIATE",
  "tags": ["Placeholder", "+3"],
  "postedAt": "2025-09-21T00:00:00Z",
  "timeRemaining": "P4M",
  "status": "ACTIVE"
}
```

- **Business rules**:
  - Bookmark inherits `matchScore` but hides it unless available from `ProjectMatchService`.
  - If project becomes unavailable (`status = ARCHIVED`), card shows disabled state with message "Project no longer available".
  - Deadline indicator derived from project `deadline`; if missing, omit display.

## 5. Empty State

- **What should happen**: If no bookmarks, render empty illustration with CTA `Explore Projects` linking to `Project feed` route.
- **How**: API returns `{ cards: [], counts: { total: 0 } }`; frontend triggers empty-state component.

## 6. Bookmark Creation & Removal

- **How**:
  - Add bookmark: `POST /students/{studentId}/bookmarks` body `{ projectId }`.
  - Remove bookmark: `DELETE /students/{studentId}/bookmarks/{bookmarkId}` or `DELETE ...?projectId=`.
  - Bulk removal (optional): `POST /students/{studentId}/bookmarks/bulk-delete` with list of IDs.
- **Business rules**:
  - Duplicates prevented; duplicate add returns `ERR_4002`.
  - Max 100 active bookmarks; exceeding returns `ERR_5003`.

## 7. Sharing & Visibility

- **What should happen**: Tabs indicate whether bookmark created by student or shared (e.g., supervisor-suggested).
- **How**: `StudentBookmark.sharedBy` field; if not null, categorize under `Shared with me`.
- **Frontend expects**:

```json
{
  "sharedBy": {
    "id": "supervisor-uuid",
    "name": "Dr. Nwachukwu"
  }
}
```

- **Business rules**:
  - Shared bookmarks are read-only; student cannot delete unless owner toggled permission.
  - Accepting shared bookmark emits `NotificationType.INFO` to sharer when student saves or removes.

## 8. Search Functionality

- **How**: GraphQL `studentBookmarks.search(studentId, term)` returning matching bookmark IDs; client filters list.
- **Frontend expects**: `{ bookmarkIds: ["bookmark-uuid"] }`.

## 9. Interaction Hooks

- **Open project detail**: Clicking card navigates to project overview using `/projects/{projectId}` detail API defined in `student_Project_Feed.md`.
- **Express interest**: Button within card uses `POST /projects/{projectId}/interest`; must validate eligibility same as feed.
- **Remove**: UI includes action menu invoking delete endpoint. On success, emit `NotificationType.SUCCESS` to student.

## 10. Data Contracts & Limits

- GraphQL response includes pagination `pageInfo { hasNextPage, endCursor }` with default page size 9.
- All timestamps ISO8601.
- `difficulty` enums: `ROOKIE`, `INTERMEDIATE`, `ADVANCED`.
- `status` reflects project availability: `ACTIVE`, `ARCHIVED`, `FILLED`.
- Skills array limited to 6 tags with overflow aggregated.

## 11. Notifications & Logging

- Bookmark add/remove events send notifications via `NotificationModule`.
  - Add: `NotificationType.SUCCESS` with message "Saved to bookmarks".
  - Remove: `NotificationType.INFO`.
- Actions logged using `ContextService.getLoggingContext()` to capture `correlationId`.

## 12. Error Handling

- Use `ErrorModule` standardized responses.
  - `ERR_3000`: Missing or invalid student context.
  - `ERR_4000`: Bookmark not found.
  - `ERR_5002`: Unauthorized access to another student’s bookmarks.
  - `ERR_5003`: Bookmark limit reached.

## 13. Dependencies & Navigation

- Sidebar navigation consistent with `student_user_dashboard.md`.
- CTA "Explore Projects" routes to project feed using existing GraphQL queries outlined in `student_Project_Feed.md`.
- Bookmark counts should synchronize with dashboard suggestions widget if present.
