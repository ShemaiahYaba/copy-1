# Student Experiences Subdomain

Student-specific experiential learning management.

## Purpose

- Provides student view of experiences (created + shared)
- Manages experience lifecycle (draft -> published -> archived)
- Enriches with recommended projects
- Enforces student business rules (draft limits, publish limits)

## Responsibilities

- View management: grid vs list layouts
- Filtering: created by me, shared with me, all
- Lifecycle: draft (max 5), published (max 10), archive
- Recommendations: match experiences with projects
- Authorization: students can only edit their own experiences

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
  createStudentExperience(input: { title: "My Experience" })
}
```

## Business Rules

- Max 5 draft experiences
- Max 10 published experiences
- Only creator can edit/publish/archive
- Recommended projects only shown for published experiences
- Deletion only allowed for drafts
