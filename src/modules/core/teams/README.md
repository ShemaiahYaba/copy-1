# Teams Module (Core)

Core CRUD module for team management and team membership assignments.

## Purpose

- Manages team lifecycle and membership
- Provides tenant-isolated data access
- Exports service for domain consumption

## Tables

- `teams` - Team records
- `team_assignments` - Many-to-many team membership

## Status Flow

ACTIVE -> INACTIVE -> COMPLETED -> DISBANDED

## Exported Service

`TeamsService` provides:

- `create(dto)` - Create team and lead assignment
- `findAll(filters)` - Paginated list (tenant-filtered)
- `findById(id)` - Single team (tenant-validated)
- `findByStudentId(studentId)` - Dashboard lookup
- `update(id, dto)` - Update with permission check
- `addMember(teamId, dto)` - Add team member

## Domain Usage

```typescript
@Injectable()
export class StudentTeamsService {
  constructor(private readonly teamsService: TeamsService) {}

  async getStudentTeams(studentId: string) {
    return this.teamsService.findByStudentId(studentId);
  }
}
```
