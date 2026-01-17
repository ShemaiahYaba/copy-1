# Student Bookmarks Subdomain

Student-specific project bookmarking functionality.

## Purpose

- Allows students to save/unsave projects
- Provides bookmark management (CRUD)
- Enriches bookmarks with project data
- Tracks bookmark limits (max 100)

## Architecture Pattern

```typescript
// DOMAIN service injects CORE services
constructor(
  private readonly projectsService: ProjectsService, // Core
) {}

async create(dto: CreateBookmarkDto) {
  // Validate project exists via core service
  const project = await this.projectsService.findById(dto.projectId);

  // Then create bookmark
  await this.db.insert(bookmarks).values(...);
}
```

## Why Student Domain?

Bookmarks are student-specific because:

- Only students bookmark projects
- Business rules are student-centric (100 limit)
- Enrichment is for student UI (ProjectCard view)

If supervisors needed bookmarks later, they'd get their own subdomain with
different limits/rules.

## GraphQL Queries

```graphql
query {
  studentBookmarks(filters: { limit: 10 }) {
    cards {
      id
      projectId
      title
      organization
    }
    total
  }
}

mutation {
  createBookmark(input: { projectId: "..." })
}
```
