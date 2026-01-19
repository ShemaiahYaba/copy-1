# Student Dashboard Subdomain

The orchestration module that aggregates data from multiple student services.

## Purpose

- Single entry point for student home page
- Orchestrates modules in parallel
- Provides personalized greeting and quick actions
- Shows tasks, projects, experiences, teams, suggestions

## Architecture Pattern

```typescript
// ORCHESTRATOR pattern - injects multiple modules
constructor(
  private readonly projectsService: ProjectsService,
  private readonly experiencesService: ExperiencesService,
  private readonly teamsService: TeamsService,
  private readonly bookmarksService: StudentBookmarksService,
) {}

async getDashboard() {
  const [tasks, projects, experiences, teams] = await Promise.allSettled([
    this.fetchTasks(),
    this.fetchProjects(),
    this.fetchExperiences(),
    this.fetchTeams(),
  ]);

  return {
    tasks: tasks.status === 'fulfilled' ? tasks.value : [],
    projects: projects.status === 'fulfilled' ? projects.value : [],
  };
}
```

## Resilience

- Uses Promise.allSettled for graceful degradation
- Empty arrays returned for failed fetches
- No cascading failures

## GraphQL Query

```graphql
query {
  studentDashboard(filters: { taskStatus: ONGOING }) {
    header { greeting hasMatches }
    tasks { title projectName dueAt isOverdue }
    projects { name companyName matchScore }
    experiences { title status }
    teams { name role unreadThreadCount }
    counts { tasksCount projectsCount experiencesCount teamsCount }
  }
}
```

## TODOs

- Implement TasksService integration
- Add ProjectMatchService for suggestions
- Integrate NotificationService history
- Add messaging unread counts
- Fetch team member avatars
