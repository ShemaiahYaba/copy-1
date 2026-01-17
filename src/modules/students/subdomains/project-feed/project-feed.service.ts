// ============================================================================
// PROJECT FEED SERVICE (DOMAIN - Student-Specific)
// src/modules/students/subdomains/project-feed/project-feed.service.ts
// ============================================================================

import { Injectable } from '@nestjs/common';
import { ProjectsService } from '@modules/core/projects/projects.service';
import { StudentBookmarksService } from '@modules/students/subdomains/bookmarks/bookmarks.service';
import { ContextService } from '@modules/shared/context/context.service';
import { AppError } from '@shared/error/classes/app-error.class';
import { ERROR_CODES } from '@shared/error/constants/error-codes.constant';
import type { FilterBookmarksDto } from '@modules/students/subdomains/bookmarks/dto/filter-bookmarks.dto';
import {
  ProjectFeedFiltersDto,
  ProjectFeedSortOption,
} from './dto/project-feed-filters.dto';
import type { StudentProjectCardEntity } from './entities/project-card.entity';

const MAX_BOOKMARK_SCAN = 1000;

type ProjectLike = {
  id: string;
  title: string;
  description?: string | null;
  requiredSkills?: string[] | null;
  tags?: string[] | null;
  category?: string | null;
  status: string;
  createdAt: Date;
  deadline?: Date | null;
  organization?: string | null;
  organizationLogoUrl?: string | null;
  difficulty?: string | null;
};

@Injectable()
export class ProjectFeedService {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly bookmarksService: StudentBookmarksService,
    private readonly contextService: ContextService,
  ) {}

  /**
   * Get project feed for authenticated student.
   */
  async getProjectFeed(filters: ProjectFeedFiltersDto) {
    const { studentId, universityId, role } = this.contextService.getContext();

    if (!studentId || role !== 'student') {
      throw new AppError(
        ERROR_CODES.UNAUTHORIZED,
        'Only students can access project feed',
      );
    }

    if (!universityId) {
      throw new AppError(
        ERROR_CODES.MISSING_CONTEXT,
        'University context required',
      );
    }

    const projectsResult = await this.projectsService.findAll({
      page: filters.page,
      limit: filters.limit,
      search: filters.search,
      status: 'published',
      approvalStatus: 'approved',
      isPublished: true,
      sortBy: this.mapSortToCoreField(filters.sort),
      sortOrder:
        filters.sort === 'OLDEST' || filters.sort === 'DEADLINE_SOON'
          ? 'asc'
          : 'desc',
    });

    let filteredProjects = projectsResult.items;
    if (filters.categories && filters.categories.length > 0) {
      filteredProjects = filteredProjects.filter((project) =>
        filters.categories!.includes(project.category || ''),
      );
    }

    const bookmarkedProjectIds = await this.getBookmarkedProjectIds();

    const cards: StudentProjectCardEntity[] = filteredProjects.map(
      (project) => {
        const isBookmarked = bookmarkedProjectIds.has(project.id);

        return {
          id: project.id,
          title: project.title,
          organization: project.organization || 'Unknown Organization',
          organizationLogoUrl: project.organizationLogoUrl ?? undefined,
          summary: this.createSummary(project.description ?? undefined),
          skills: project.requiredSkills || [],
          difficulty:
            project.difficulty || this.mapDifficulty(project.category),
          category: project.category || 'other',
          postedAt: project.createdAt.toISOString(),
          matchScore: this.calculateMatchScore(project, studentId),
          timeRemaining: this.calculateTimeRemaining(
            project.deadline ?? undefined,
          ),
          tags: this.generateTags(project, isBookmarked),
          status: project.status,
        };
      },
    );

    if (filters.sort === 'MATCH_SCORE') {
      cards.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
    } else if (filters.sort === 'DEADLINE_SOON') {
      cards.sort((a, b) => {
        if (!a.timeRemaining) return 1;
        if (!b.timeRemaining) return -1;
        return a.timeRemaining.localeCompare(b.timeRemaining);
      });
    }

    const availableCategories = this.getAvailableCategories(
      projectsResult.items,
    );
    const availableSkills = this.getAvailableSkills(projectsResult.items);
    const endCursor =
      cards.length > 0 ? cards[cards.length - 1].postedAt : undefined;

    const returnValue = {
      cards: cards ?? [],
      filtersMeta: {
        availableCategories,
        availableSkills,
        defaultSort: 'MATCH_SCORE',
      },
      pageInfo: {
        hasNextPage: projectsResult.hasNextPage ?? false,
        endCursor: endCursor ?? undefined,
      },
      total:
        typeof projectsResult.total === 'number'
          ? projectsResult.total
          : Number(projectsResult.total ?? 0),
    };

    console.log('SERVICE_DEBUG', {
      totalFromDB: projectsResult.total,
      totalType: typeof projectsResult.total,
      finalTotal: returnValue.total,
      finalTotalType: typeof returnValue.total,
      cardsCount: returnValue.cards.length,
    });

    return returnValue;
  }

  /**
   * Search projects by term
   */
  async searchProjects(term: string) {
    const { studentId } = this.contextService.getContext();

    if (!studentId) {
      throw new AppError(
        ERROR_CODES.UNAUTHORIZED,
        'User must be authenticated',
      );
    }

    const result = await this.projectsService.findAll({
      search: term,
      status: 'published',
      approvalStatus: 'approved',
      isPublished: true,
      limit: 20,
    });

    return {
      cardIds: result.items.map((p) => p.id),
    };
  }

  /**
   * Express interest in a project (student action)
   */
  async expressInterest(projectId: string) {
    const { studentId } = this.contextService.getContext();

    if (!studentId) {
      throw new AppError(
        ERROR_CODES.UNAUTHORIZED,
        'User must be authenticated',
      );
    }

    await this.projectsService.findById(projectId);

    throw new AppError(
      ERROR_CODES.OPERATION_NOT_ALLOWED,
      'Express interest feature coming soon',
    );
  }

  /**
   * Bookmark a project (student action)
   */
  async bookmarkProject(projectId: string) {
    return this.bookmarksService.create({ projectId });
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private mapSortToCoreField(sort?: ProjectFeedSortOption): string {
    switch (sort) {
      case 'NEWEST':
      case 'OLDEST':
        return 'createdAt';
      case 'DEADLINE_SOON':
        return 'deadline';
      case 'MATCH_SCORE':
      default:
        return 'createdAt';
    }
  }

  private mapDifficulty(category?: string): string {
    const difficultyMap: Record<string, string> = {
      web_development: 'ROOKIE',
      mobile_development: 'INTERMEDIATE',
      data_science: 'INTERMEDIATE',
      machine_learning: 'ADVANCED',
      design: 'ROOKIE',
      marketing: 'ROOKIE',
      research: 'INTERMEDIATE',
      consulting: 'INTERMEDIATE',
      other: 'INTERMEDIATE',
    };

    return difficultyMap[category || 'other'] || 'INTERMEDIATE';
  }

  private calculateTimeRemaining(deadline?: Date): string | undefined {
    if (!deadline) return undefined;

    const now = new Date();
    const diff = deadline.getTime() - now.getTime();
    if (diff <= 0) return undefined;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const months = Math.floor(days / 30);

    if (months > 0) {
      return `P${months}M`;
    }

    return `P${days}D`;
  }

  private calculateMatchScore(
    project: ProjectLike, // eslint-disable-line @typescript-eslint/no-unused-vars
    studentId: string, // eslint-disable-line @typescript-eslint/no-unused-vars
  ): number | undefined {
    return undefined;
  }

  private async getBookmarkedProjectIds(): Promise<Set<string>> {
    try {
      const filters: FilterBookmarksDto = {
        page: 1,
        limit: MAX_BOOKMARK_SCAN,
      };
      const bookmarks = await this.bookmarksService.findAll(filters);
      return new Set(bookmarks.cards.map((b) => b.projectId));
    } catch {
      return new Set();
    }
  }

  private generateTags(project: ProjectLike, isBookmarked: boolean): string[] {
    const tags: string[] = [];

    if (isBookmarked) {
      tags.push('Bookmarked');
    }

    if (project.tags?.length) {
      tags.push(...project.tags);
    }

    const skills = project.requiredSkills || [];
    if (skills.length > 6) {
      tags.push(`+${skills.length - 6}`);
    }

    return tags;
  }

  private getAvailableCategories(projects: ProjectLike[]): string[] {
    const categories = new Set<string>();
    projects.forEach((project) => {
      if (project.category) categories.add(project.category);
    });
    return Array.from(categories);
  }

  private getAvailableSkills(projects: ProjectLike[]): string[] {
    const skills = new Set<string>();
    projects.forEach((project) => {
      if (project.requiredSkills) {
        project.requiredSkills.forEach((skill: string) => skills.add(skill));
      }
    });
    return Array.from(skills);
  }

  private createSummary(description?: string): string {
    if (!description) return '';
    const trimmed = description.trim();
    if (trimmed.length <= 180) return trimmed;
    return `${trimmed.slice(0, 180)}...`;
  }
}
