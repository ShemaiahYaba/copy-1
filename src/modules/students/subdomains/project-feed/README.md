# Project Feed Subdomain (Student Domain)

Student-specific project discovery and browsing.

## Purpose

- Provides student view of available projects
- Filters projects by eligibility
- Enriches with match scores and bookmarking status
- Orchestrates ProjectsService and BookmarksService

## Responsibilities

- **Filtering**: Only show published, approved projects
- **Sorting**: Match score, newest, deadline
- **Enrichment**: Add bookmark status, calculate time remaining
- **Actions**: Express interest, bookmark project

## Service Pattern

```typescript
// DOMAIN service injects CORE services
constructor(
  private readonly projectsService: ProjectsService, // Core
  private readonly bookmarksService: BookmarksService, // Core
) {}

async getProjectFeed() {
  // Step 1: Get data from core
  const projects = await this.projectsService.findAll();

  // Step 2: Apply student-specific filtering
  const filtered = projects.filter(isEligible);

  // Step 3: Enrich with student-specific data
  return enriched;
}
```

## GraphQL Queries

```graphql
query StudentProjectFeed($filters: ProjectFeedFiltersDto) {
  studentProjectFeed(filters: $filters) {
    cards {
      id
      title
      organization
      summary
      skills
      matchScore
    }
    filtersMeta {
      availableCategories
    }
    pageInfo {
      hasNextPage
    }
    total
  }
}
```
