// ============================================================================
// STUDENT DASHBOARD SERVICE (DOMAIN ORCHESTRATOR)
// src/modules/students/subdomains/dashboard/dashboard.service.ts
// ============================================================================

import { Injectable } from '@nestjs/common';
import { ProjectsService } from '@modules/core/projects/projects.service';
import { ExperiencesService } from '@modules/core/experiences/experiences.service';
import { TeamsService } from '@modules/core/teams/teams.service';
import { StudentBookmarksService } from '../bookmarks/bookmarks.service';
import { ContextService } from '@modules/shared/context/context.service';
import { AppError } from '@shared/error/classes/app-error.class';
import { ERROR_CODES } from '@shared/error/constants/error-codes.constant';
import type { DashboardFiltersDto } from './dto/dashboard-filters.dto';
import type {
  StudentDashboardEntity,
  DashboardTaskEntity,
  DashboardProjectEntity,
  DashboardExperienceEntity,
  DashboardTeamEntity,
  DashboardSuggestionEntity,
  DashboardNotificationsEntity,
} from './entities/dashboard.entity';

@Injectable()
export class StudentDashboardService {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly experiencesService: ExperiencesService,
    private readonly teamsService: TeamsService,
    private readonly bookmarksService: StudentBookmarksService,
    private readonly contextService: ContextService,
  ) {}

  /**
   * Get complete dashboard data.
   */
  async getDashboard(
    filters: DashboardFiltersDto = {},
  ): Promise<StudentDashboardEntity> {
    const { studentId, universityId, role, email } =
      this.contextService.getContext();

    if (!studentId || role !== 'student') {
      throw new AppError(
        ERROR_CODES.UNAUTHORIZED,
        'Only students can access dashboard',
      );
    }

    if (!universityId) {
      throw new AppError(
        ERROR_CODES.MISSING_CONTEXT,
        'University context required',
      );
    }

    const [
      tasksResult,
      projectsResult,
      experiencesResult,
      teamsResult,
      bookmarksResult,
    ] = await Promise.allSettled([
      this.fetchTasks(studentId, filters.taskStatus),
      this.fetchProjects(studentId, filters.projectStatus),
      this.fetchExperiences(studentId, filters.experienceStatus),
      this.fetchTeams(studentId),
      this.bookmarksService.getCount(),
    ]);

    const tasks = tasksResult.status === 'fulfilled' ? tasksResult.value : [];
    const projects =
      projectsResult.status === 'fulfilled' ? projectsResult.value : [];
    const experiences =
      experiencesResult.status === 'fulfilled'
        ? experiencesResult.value
        : [];
    const teams = teamsResult.status === 'fulfilled' ? teamsResult.value : [];
    const bookmarksCount =
      bookmarksResult.status === 'fulfilled' ? bookmarksResult.value : 0;

    return {
      header: this.buildHeader(email),
      tasks,
      projects,
      experiences,
      teams,
      suggestions: this.buildSuggestions(bookmarksCount),
      notifications: this.buildNotifications(),
      counts: {
        tasksCount: tasks.length,
        projectsCount: projects.length,
        experiencesCount: experiences.length,
        teamsCount: teams.length,
      },
    };
  }

  // ============================================================================
  // PRIVATE FETCHERS
  // ============================================================================

  private async fetchTasks(
    studentId: string,
    status?: string,
  ): Promise<DashboardTaskEntity[]> {
    void studentId;
    void status;

    return [
      {
        id: 'task-1',
        title: 'Complete project proposal',
        projectId: 'proj-1',
        projectName: 'AI Healthcare Diagnostics',
        status: 'ONGOING',
        dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        isOverdue: false,
      },
      {
        id: 'task-2',
        title: 'Submit weekly report',
        projectId: 'proj-1',
        projectName: 'AI Healthcare Diagnostics',
        status: 'ONGOING',
        dueAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        isOverdue: true,
      },
    ];
  }

  private async fetchProjects(
    studentId: string,
    status?: string,
  ): Promise<DashboardProjectEntity[]> {
    void studentId;

    const result = await this.projectsService.findAll({
      status: status === 'ONGOING' ? 'in_progress' : undefined,
      isPublished: true,
      limit: 5,
      sortBy: 'updatedAt',
      sortOrder: 'desc',
    });

    return result.items.map((project) => ({
      id: project.id,
      name: project.title,
      companyName: project.organization || 'Unknown Company',
      status: this.mapProjectStatus(project.status),
      lastUpdatedAt: project.updatedAt.toISOString(),
      matchScore: undefined,
    }));
  }

  private async fetchExperiences(
    studentId: string,
    status?: string,
  ): Promise<DashboardExperienceEntity[]> {
    const result = await this.experiencesService.findAll({
      status: status === 'PUBLISHED' ? 'PUBLISHED' : undefined,
      limit: 5,
      sortBy: 'updatedAt',
      sortOrder: 'desc',
    });

    const studentExperiences = result.items.filter(
      (exp) => exp.createdBy === studentId,
    );

    return studentExperiences.map((exp) => ({
      id: exp.id,
      title: exp.title,
      status: exp.status,
      lastEditedAt: exp.updatedAt.toISOString(),
    }));
  }

  private async fetchTeams(studentId: string): Promise<DashboardTeamEntity[]> {
    const teams = await this.teamsService.findByStudentId(studentId);

    return teams.slice(0, 3).map((team) => ({
      id: team.id,
      name: team.name,
      role: 'MEMBER',
      avatarUrls: [],
      unreadThreadCount: 0,
    }));
  }

  // ============================================================================
  // PRIVATE BUILDERS
  // ============================================================================

  private buildHeader(email?: string) {
    const hour = new Date().getHours();
    let greeting = 'Good evening';
    if (hour < 12) greeting = 'Good morning';
    else if (hour < 18) greeting = 'Good afternoon';

    return {
      greeting: `${greeting}${email ? `, ${email.split('@')[0]}` : ''}!`,
      lastLoginAt: new Date().toISOString(),
      hasMatches: false,
    };
  }

  private buildSuggestions(bookmarksCount: number): DashboardSuggestionEntity[] {
    if (bookmarksCount > 0) {
      return [
        {
          projectId: 'suggested-1',
          projectName: 'Explore Your Bookmarks',
          reason: `You have ${bookmarksCount} saved project(s)`,
          matchScore: 0.9,
          actionRequired: false,
        },
      ];
    }

    return [];
  }

  private buildNotifications(): DashboardNotificationsEntity {
    return {
      unreadCount: 0,
      latest: [],
    };
  }

  private mapProjectStatus(status: string): string {
    const statusMap: Record<string, string> = {
      draft: 'DRAFT',
      published: 'ONGOING',
      in_progress: 'ONGOING',
      completed: 'COMPLETED',
      cancelled: 'CANCELLED',
    };
    return statusMap[status] || 'ONGOING';
  }
}
