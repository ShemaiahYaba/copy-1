# Experiences Module (Core)

Core CRUD module for student experiential learning records.

## Purpose

- Manages experience lifecycle (create, publish, archive)
- Provides tenant-isolated data access
- Exports service for domain consumption

## Tables

- `experiences` - Main experience records
- `experience_participants` - Many-to-many with users

## Status Flow

DRAFT -> PUBLISHED -> ARCHIVED

## Exported Service

`ExperiencesService` provides:

- `create(dto)` - Create draft experience
- `findAll(filters)` - Paginated list (tenant-filtered)
- `findById(id)` - Single experience (tenant-validated)
- `update(id, dto)` - Update with ownership check
- `publish(id)` - Transition to published
- `archive(id)` - Soft delete
- `delete(id)` - Hard delete (drafts only)

## Domain Usage

```typescript
@Injectable()
export class StudentExperiencesService {
  constructor(
    private readonly experiencesService: ExperiencesService,
  ) {}

  async getStudentExperiences() {
    return this.experiencesService.findAll({ status: 'PUBLISHED' });
  }
}
```
