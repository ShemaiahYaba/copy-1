// ============================================================================
// STUDENT BOOKMARKS SERVICE (DOMAIN)
// src/modules/students/subdomains/bookmarks/bookmarks.service.ts
// ============================================================================

import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@database/database.service';
import { bookmarks } from '@modules/students/subdomains/bookmarks/models/bookmark.model';
import { projects } from '@modules/core/projects/models/project.model';
import { ProjectsService } from '@modules/core/projects/projects.service';
import {
  eq,
  and,
  inArray,
  desc,
  ilike,
  or,
  count,
  isNull,
  isNotNull,
} from 'drizzle-orm';
import { ContextService } from '@modules/shared/context/context.service';
import { NotificationService } from '@modules/shared/notification/notification.service';
import { NotificationType } from '@modules/shared/notification/interfaces';
import { ERROR_CODES } from '@shared/error/constants/error-codes.constant';
import { AppError } from '@shared/error/classes/app-error.class';
import { CreateBookmarkDto } from './dto/create-bookmark.dto';
import { FilterBookmarksDto, BookmarkFilter } from './dto/filter-bookmarks.dto';
import { BulkDeleteBookmarksDto } from './dto/bulk-delete-bookmarks.dto';
import type { BookmarkCardEntity } from './entities/bookmark.entity';

const MAX_BOOKMARKS_PER_STUDENT = 100;

@Injectable()
export class StudentBookmarksService {
  constructor(
    private readonly db: DatabaseService,
    private readonly projectsService: ProjectsService,
    private readonly contextService: ContextService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Create bookmark (student action)
   */
  async create(dto: CreateBookmarkDto) {
    const { studentId, universityId } = this.contextService.getContext();

    if (!studentId) {
      throw new AppError(
        ERROR_CODES.UNAUTHORIZED,
        'User must be authenticated',
      );
    }

    if (!universityId) {
      throw new AppError(
        ERROR_CODES.MISSING_CONTEXT,
        'University context required',
      );
    }

    const project = await this.projectsService.findById(dto.projectId);

    const [existing] = await this.db.db
      .select()
      .from(bookmarks)
      .where(
        and(
          eq(bookmarks.studentId, studentId),
          eq(bookmarks.projectId, dto.projectId),
          eq(bookmarks.universityId, universityId),
        ),
      )
      .limit(1);

    if (existing) {
      throw new AppError(
        ERROR_CODES.ALREADY_EXISTS,
        'Project already bookmarked',
        { projectId: dto.projectId },
      );
    }

    const currentCount = await this.getCount();
    if (currentCount >= MAX_BOOKMARKS_PER_STUDENT) {
      throw new AppError(
        ERROR_CODES.OPERATION_NOT_ALLOWED,
        `Maximum bookmark limit reached (${MAX_BOOKMARKS_PER_STUDENT})`,
        { currentCount },
      );
    }

    const [bookmark] = await this.db.db
      .insert(bookmarks)
      .values({
        studentId,
        projectId: dto.projectId,
        sharedBy: dto.sharedBy || null,
        universityId,
      })
      .returning();

    await this.notificationService.push({
      type: NotificationType.SUCCESS,
      message: `Saved "${project.title}" to bookmarks`,
      context: { bookmarkId: bookmark.id, projectId: project.id },
    });

    return bookmark;
  }

  /**
   * Get all bookmarks with enriched project data
   */
  async findAll(filters: FilterBookmarksDto) {
    const { studentId, universityId } = this.contextService.getContext();

    if (!studentId) {
      throw new AppError(
        ERROR_CODES.UNAUTHORIZED,
        'User must be authenticated',
      );
    }

    if (!universityId) {
      throw new AppError(
        ERROR_CODES.MISSING_CONTEXT,
        'University context required',
      );
    }

    const {
      page = 1,
      limit = 10,
      search,
      filter = BookmarkFilter.ALL,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters;

    const offset = (page - 1) * limit;

    const conditions = [
      eq(bookmarks.studentId, studentId),
      eq(bookmarks.universityId, universityId),
    ];

    if (filter === BookmarkFilter.CREATED) {
      conditions.push(isNull(bookmarks.sharedBy));
    }

    if (filter === BookmarkFilter.SHARED) {
      conditions.push(isNotNull(bookmarks.sharedBy));
    }

    if (search) {
      conditions.push(
        or(
          ilike(projects.title, `%${search}%`),
          ilike(projects.description ?? '', `%${search}%`),
        )!,
      );
    }

    const whereClause = and(...conditions);

    let orderByClause;
    if (sortBy === 'createdAt') {
      orderByClause =
        sortOrder === 'asc' ? bookmarks.createdAt : desc(bookmarks.createdAt);
    } else {
      orderByClause = desc(bookmarks.createdAt);
    }

    const results = await this.db.db
      .select({
        bookmark: bookmarks,
        project: projects,
      })
      .from(bookmarks)
      .innerJoin(projects, eq(bookmarks.projectId, projects.id))
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

    const totalResult = await this.db.db
      .select({ count: count() })
      .from(bookmarks)
      .innerJoin(projects, eq(bookmarks.projectId, projects.id))
      .where(whereClause);

    const total = totalResult[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);

    const cards: BookmarkCardEntity[] = results.map(
      ({ bookmark, project }) => ({
        id: bookmark.id,
        projectId: project.id,
        title: project.title,
        organization: project.organization || 'Unknown',
        organizationLogoUrl: project.organizationLogoUrl ?? undefined,
        summary: project.description?.substring(0, 180) || '',
        skills: project.requiredSkills || [],
        difficulty: project.difficulty || 'INTERMEDIATE',
        tags: this.formatTags(project.tags || []),
        postedAt: project.createdAt,
        timeRemaining: this.calculateTimeRemaining(
          project.deadline ?? undefined,
        ),
        status: this.mapProjectStatus(project.status),
        sharedBy: bookmark.sharedBy
          ? { id: bookmark.sharedBy, name: 'Supervisor' }
          : undefined,
        createdAt: bookmark.createdAt,
      }),
    );

    return {
      cards,
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }

  /**
   * Find single bookmark by ID
   */
  async findOne(id: string) {
    const { studentId, universityId } = this.contextService.getContext();

    if (!studentId) {
      throw new AppError(
        ERROR_CODES.UNAUTHORIZED,
        'User must be authenticated',
      );
    }

    if (!universityId) {
      throw new AppError(
        ERROR_CODES.MISSING_CONTEXT,
        'University context required',
      );
    }

    const [bookmark] = await this.db.db
      .select()
      .from(bookmarks)
      .where(
        and(eq(bookmarks.id, id), eq(bookmarks.universityId, universityId)),
      )
      .limit(1);

    if (!bookmark) {
      throw new AppError(ERROR_CODES.RESOURCE_NOT_FOUND, 'Bookmark not found', {
        bookmarkId: id,
      });
    }

    return bookmark;
  }

  /**
   * Remove bookmark by ID
   */
  async remove(id: string) {
    const { studentId, universityId } = this.contextService.getContext();

    if (!studentId) {
      throw new AppError(
        ERROR_CODES.UNAUTHORIZED,
        'User must be authenticated',
      );
    }

    if (!universityId) {
      throw new AppError(
        ERROR_CODES.MISSING_CONTEXT,
        'University context required',
      );
    }

    const [bookmark] = await this.db.db
      .select()
      .from(bookmarks)
      .where(
        and(eq(bookmarks.id, id), eq(bookmarks.universityId, universityId)),
      )
      .limit(1);

    if (!bookmark) {
      throw new AppError(ERROR_CODES.RESOURCE_NOT_FOUND, 'Bookmark not found', {
        bookmarkId: id,
      });
    }

    await this.db.db.delete(bookmarks).where(eq(bookmarks.id, id));

    await this.notificationService.push({
      type: NotificationType.INFO,
      message: 'Bookmark removed',
      context: { bookmarkId: id },
    });

    return { success: true, message: 'Bookmark removed' };
  }

  /**
   * Remove bookmark by project ID
   */
  async removeByProjectId(projectId: string) {
    const { studentId, universityId } = this.contextService.getContext();

    if (!studentId) {
      throw new AppError(
        ERROR_CODES.UNAUTHORIZED,
        'User must be authenticated',
      );
    }

    if (!universityId) {
      throw new AppError(
        ERROR_CODES.MISSING_CONTEXT,
        'University context required',
      );
    }

    const deleted = await this.db.db
      .delete(bookmarks)
      .where(
        and(
          eq(bookmarks.studentId, studentId),
          eq(bookmarks.projectId, projectId),
          eq(bookmarks.universityId, universityId),
        ),
      )
      .returning();

    if (deleted.length === 0) {
      throw new AppError(ERROR_CODES.RESOURCE_NOT_FOUND, 'Bookmark not found', {
        projectId,
      });
    }

    await this.notificationService.push({
      type: NotificationType.INFO,
      message: 'Bookmark removed',
      context: { projectId },
    });

    return { success: true, message: 'Bookmark removed' };
  }

  /**
   * Bulk delete bookmarks
   */
  async bulkDelete(dto: BulkDeleteBookmarksDto) {
    const { studentId, universityId } = this.contextService.getContext();

    if (!studentId) {
      throw new AppError(
        ERROR_CODES.UNAUTHORIZED,
        'User must be authenticated',
      );
    }

    if (!universityId) {
      throw new AppError(
        ERROR_CODES.MISSING_CONTEXT,
        'University context required',
      );
    }

    const existing = await this.db.db
      .select()
      .from(bookmarks)
      .where(
        and(
          eq(bookmarks.studentId, studentId),
          eq(bookmarks.universityId, universityId),
          inArray(bookmarks.id, dto.bookmarkIds),
        ),
      );

    if (existing.length === 0) {
      throw new AppError(
        ERROR_CODES.RESOURCE_NOT_FOUND,
        'No bookmarks found to delete',
      );
    }

    await this.db.db
      .delete(bookmarks)
      .where(
        and(
          eq(bookmarks.studentId, studentId),
          eq(bookmarks.universityId, universityId),
          inArray(bookmarks.id, dto.bookmarkIds),
        ),
      );

    await this.notificationService.push({
      type: NotificationType.SUCCESS,
      message: `Deleted ${existing.length} bookmark(s)`,
      context: { count: existing.length },
    });

    return {
      success: true,
      deletedCount: existing.length,
      message: `Deleted ${existing.length} bookmark(s)`,
    };
  }

  /**
   * Search bookmarks
   */
  async search(term: string) {
    const { studentId, universityId } = this.contextService.getContext();

    if (!studentId) {
      throw new AppError(
        ERROR_CODES.UNAUTHORIZED,
        'User must be authenticated',
      );
    }

    if (!universityId) {
      throw new AppError(
        ERROR_CODES.MISSING_CONTEXT,
        'University context required',
      );
    }

    const results = await this.db.db
      .select({ id: bookmarks.id })
      .from(bookmarks)
      .innerJoin(projects, eq(bookmarks.projectId, projects.id))
      .where(
        and(
          eq(bookmarks.studentId, studentId),
          eq(bookmarks.universityId, universityId),
          or(
            ilike(projects.title, `%${term}%`),
            ilike(projects.description ?? '', `%${term}%`),
          ),
        ),
      );

    return { bookmarkIds: results.map((r) => r.id) };
  }

  /**
   * Get total bookmark count for student
   */
  async getCount(): Promise<number> {
    const { studentId, universityId } = this.contextService.getContext();

    if (!studentId || !universityId) {
      return 0;
    }

    const result = await this.db.db
      .select({ count: count() })
      .from(bookmarks)
      .where(
        and(
          eq(bookmarks.studentId, studentId),
          eq(bookmarks.universityId, universityId),
        ),
      );

    return result[0]?.count || 0;
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private formatTags(tags: string[]): string[] {
    return tags.slice(0, 6);
  }

  private calculateTimeRemaining(deadline?: Date): string | undefined {
    if (!deadline) return undefined;

    const now = new Date();
    const diff = deadline.getTime() - now.getTime();
    if (diff <= 0) return undefined;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const months = Math.floor(days / 30);

    if (months > 0) return `P${months}M`;
    return `P${days}D`;
  }

  private mapProjectStatus(status: string): string {
    const statusMap: Record<string, string> = {
      draft: 'DRAFT',
      published: 'ACTIVE',
      in_progress: 'FILLED',
      completed: 'ARCHIVED',
      cancelled: 'ARCHIVED',
    };
    return statusMap[status] || 'ACTIVE';
  }
}
