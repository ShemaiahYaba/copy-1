# Bookmarks Module

Core bookmarks CRUD for projects. This module is tenant-aware and should contain only data access and basic validation; student-specific enrichment belongs in the student domain.

## Structure

```bash
bookmarks/
  dto/
  entities/
  models/
  relations/
  bookmarks.resolver.ts
  bookmarks.service.ts
```

## Database Schema

Table: `bookmarks`

- `id` (uuid)
- `studentId` (uuid, FK users.id)
- `universityId` (uuid, FK universities.id)
- `projectId` (uuid, FK projects.id)
- `sharedBy` (uuid, FK users.id, nullable)
- `createdAt`, `updatedAt`

Indexes: student, university, project, sharedBy, createdAt. Unique constraint on `(studentId, projectId)`.

## Responsibilities

- Create/delete bookmarks.
- Enforce tenant isolation via `universityId` from `ContextService`.
- Validate project existence via `ProjectsService.findById`.
- Emit notifications for add/remove events.

## Dependencies

- DatabaseModule
- ContextModule
- NotificationModule
- ProjectsModule

## Error Handling

Uses `AppError` with `ERROR_CODES`, typically:

- `UNAUTHORIZED` when no authenticated user.
- `MISSING_CONTEXT` when `universityId` is missing.
- `ALREADY_EXISTS` when a bookmark already exists.
- `RESOURCE_NOT_FOUND` when bookmark or project is missing.
- `QUOTA_EXCEEDED` when max bookmarks is reached.

## Tests

Unit/integration tests live under `src/modules/core/bookmarks/_tests_`.
