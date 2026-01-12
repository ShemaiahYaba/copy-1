// ============================================================================
// PART 4: SERVICE
// src/modules/bookmarks/bookmarks.service.ts
// ============================================================================

import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@database/database.service';
import { bookmarks } from './models/bookmark.model';
import { projects } from '@modules/projects/models/project.model';
import { users } from '@modules/core/auth/models/user.model';
import {
  eq,
  and,
  or,
  ilike,
  desc,
  asc,
  count,
  isNull,
  isNotNull,
  inArray,
} from 'drizzle-orm';
import { ContextService } from '@modules/shared/context/context.service';
import { NotificationService } from '@modules/shared/notification/notification.service';
import { NotificationType } from '@modules/shared/notification/interfaces';
import { ERROR_CODES } from '@shared/error/constants/error-codes.constant';
import { AppError } from '@shared/error/classes/app-error.class';
import { CreateBookmarkDto } from './dto/create-bookmark.dto';
import { FilterBookmarksDto, BookmarkFilter } from './dto/filter-bookmarks.dto';
import { BulkDeleteBookmarksDto } from './dto/bulk-delete-bookmarks.dto';
import { BookmarkCardEntity } from './entities/bookmark.entity';

const MAX_BOOKMARKS_PER_STUDENT = 100;

@Injectable()
export class BookmarksService {
  constructor(
    private readonly db: DatabaseService,
    private readonly contextService: ContextService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Create a new bookmark (save project)
   */
  async create(dto: CreateBookmarkDto) {
    const studentId = this.contextService.getUserId();
    if (!studentId) {
      throw new AppError(
        ERROR_CODES.UNAUTHORIZED,
        'User must be authenticated',
      );
    }

    // Check if project exists
    const [project] = await this.db.db
      .select()
      .from(projects)
      .where(eq(projects.id, dto.projectId))
      .limit(1);

    if (!project) {
      throw new AppError(ERROR_CODES.RESOURCE_NOT_FOUND, 'Project not found', {
        projectId: dto.projectId,
      });
    }

    // Check if bookmark already exists
    const [existing] = await this.db.db
      .select()
      .from(bookmarks)
      .where(
        and(
          eq(bookmarks.studentId, studentId),
          eq(bookmarks.projectId, dto.projectId),
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

    // Check bookmark limit
    const [countResult] = await this.db.db
      .select({ count: count() })
      .from(bookmarks)
      .where(eq(bookmarks.studentId, studentId));

    const currentCount = countResult?.count || 0;

    if (currentCount >= MAX_BOOKMARKS_PER_STUDENT) {
      throw new AppError(
        ERROR_CODES.QUOTA_EXCEEDED,
        `Maximum bookmark limit of ${MAX_BOOKMARKS_PER_STUDENT} reached`,
        { currentCount, limit: MAX_BOOKMARKS_PER_STUDENT },
      );
    }

    // Create bookmark
    const [bookmark] = await this.db.db
      .insert(bookmarks)
      .values({
        studentId,
        projectId: dto.projectId,
        sharedBy: dto.sharedBy || null,
      })
      .returning();

    // Send notification
    await this.notificationService.push({
      type: NotificationType.SUCCESS,
      message: 'Saved to bookmarks',
      context: { bookmarkId: bookmark.id, projectId: dto.projectId },
    });

    // If shared by someone, notify them
    if (dto.sharedBy) {
      await this.notificationService.push({
        type: NotificationType.INFO,
        message: 'Student saved your shared project',
        context: { bookmarkId: bookmark.id, studentId },
      });
    }

    return bookmark;
  }

  /**
   * Get all bookmarks for a student with filtering and search
   */
  async findAll(filters: FilterBookmarksDto): Promise<{
    cards: BookmarkCardEntity[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  }> {
    const studentId = this.contextService.getUserId();
    if (!studentId) {
      throw new AppError(
        ERROR_CODES.UNAUTHORIZED,
        'User must be authenticated',
      );
    }

    const {
      page = 1,
      limit = 9,
      filter = BookmarkFilter.ALL,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters;

    const offset = (page - 1) * limit;

    // Build WHERE conditions
    const conditions = [eq(bookmarks.studentId, studentId)];

    // Apply filter type
    switch (filter) {
      case BookmarkFilter.CREATED:
        conditions.push(isNull(bookmarks.sharedBy));
        break;
      case BookmarkFilter.SHARED:
        conditions.push(isNotNull(bookmarks.sharedBy));
        break;
      case BookmarkFilter.ALL:
        // No additional filter
        break;
    }

    // Search in project title and organization (via join)
    const searchConditions = [];
    if (search) {
      searchConditions.push(
        or(
          ilike(projects.title, `%${search}%`),
          ilike(projects.description, `%${search}%`),
        ),
      );
    }

    const whereClause = and(
      ...conditions,
      ...(searchConditions.length > 0 ? searchConditions : []),
    );

    // Sorting
    let orderByClause;
    if (sortBy === 'createdAt') {
      orderByClause =
        sortOrder === 'asc'
          ? asc(bookmarks.createdAt)
          : desc(bookmarks.createdAt);
    } else {
      orderByClause = desc(bookmarks.createdAt);
    }

    // Execute query with join
    const [items, totalResult] = await Promise.all([
      this.db.db
        .select({
          bookmarkId: bookmarks.id,
          projectId: projects.id,
          title: projects.title,
          description: projects.description,
          requiredSkills: projects.requiredSkills,
          category: projects.category,
          status: projects.status,
          createdAt: bookmarks.createdAt,
          postedAt: projects.publishedAt,
          deadline: projects.deadline,
          sharedBy: bookmarks.sharedBy,
          // We'll need to fetch sharer details separately
        })
        .from(bookmarks)
        .innerJoin(projects, eq(bookmarks.projectId, projects.id))
        .where(whereClause)
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset),

      this.db.db
        .select({ count: count() })
        .from(bookmarks)
        .innerJoin(projects, eq(bookmarks.projectId, projects.id))
        .where(whereClause),
    ]);

    const total = totalResult[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);

    // Enrich with sharer details if needed
    const enrichedCards = await Promise.all(
      items.map(async (item) => {
        let sharedByData = null;

        if (item.sharedBy) {
          const [sharer] = await this.db.db
            .select({
              id: users.id,
              email: users.email,
              // Note: We'd need a name field or join with supervisor table
            })
            .from(users)
            .where(eq(users.id, item.sharedBy))
            .limit(1);

          if (sharer) {
            sharedByData = {
              id: sharer.id,
              name: sharer.email || 'Supervisor', // Fallback if no name
              email: sharer.email,
            };
          }
        }

        // Calculate time remaining
        const timeRemaining = item.deadline
          ? this.calculateTimeRemaining(item.deadline)
          : null;

        // Determine difficulty (mock for now, should come from project)
        const difficulty = this.mapDifficulty(item.category);

        // Format skills and tags
        const skills = item.requiredSkills || [];
        const tags = this.formatTags(skills);

        return {
          id: item.bookmarkId,
          projectId: item.projectId,
          title: item.title,
          organization: 'Organization Name', // TODO: Get from client/project relation
          organizationLogoUrl: undefined,
          summary: item.description.substring(0, 150) + '...',
          skills: skills.slice(0, 6),
          difficulty,
          tags,
          postedAt: item.postedAt || item.createdAt,
          timeRemaining,
          status: this.mapProjectStatus(item.status),
          sharedBy: sharedByData,
          createdAt: item.createdAt,
        } as BookmarkCardEntity;
      }),
    );

    return {
      cards: enrichedCards,
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }

  /**
   * Get a single bookmark by ID
   */
  async findOne(id: string) {
    const studentId = this.contextService.getUserId();
    if (!studentId) {
      throw new AppError(
        ERROR_CODES.UNAUTHORIZED,
        'User must be authenticated',
      );
    }

    const [bookmark] = await this.db.db
      .select()
      .from(bookmarks)
      .where(eq(bookmarks.id, id))
      .limit(1);

    if (!bookmark) {
      throw new AppError(ERROR_CODES.RESOURCE_NOT_FOUND, 'Bookmark not found', {
        bookmarkId: id,
      });
    }

    // Check ownership
    if (bookmark.studentId !== studentId) {
      throw new AppError(
        ERROR_CODES.INSUFFICIENT_PERMISSIONS,
        'You can only view your own bookmarks',
      );
    }

    return bookmark;
  }

  /**
   * Delete a single bookmark
   */
  async remove(id: string) {
    const studentId = this.contextService.getUserId();
    if (!studentId) {
      throw new AppError(
        ERROR_CODES.UNAUTHORIZED,
        'User must be authenticated',
      );
    }

    const [bookmark] = await this.db.db
      .select()
      .from(bookmarks)
      .where(eq(bookmarks.id, id))
      .limit(1);

    if (!bookmark) {
      throw new AppError(ERROR_CODES.RESOURCE_NOT_FOUND, 'Bookmark not found', {
        bookmarkId: id,
      });
    }

    // Check ownership
    if (bookmark.studentId !== studentId) {
      throw new AppError(
        ERROR_CODES.INSUFFICIENT_PERMISSIONS,
        'You can only delete your own bookmarks',
      );
    }

    // Check if it's a shared bookmark (additional permission check could be added)
    if (bookmark.sharedBy) {
      // Optional: You could prevent deletion of shared bookmarks
      // For now, we allow it but notify the sharer
      await this.notificationService.push({
        type: NotificationType.INFO,
        message: 'Student removed your shared bookmark',
        context: { bookmarkId: id, studentId },
      });
    }

    await this.db.db.delete(bookmarks).where(eq(bookmarks.id, id));

    await this.notificationService.push({
      type: NotificationType.INFO,
      message: 'Removed from bookmarks',
      context: { bookmarkId: id },
    });

    return { success: true, message: 'Bookmark removed successfully' };
  }

  /**
   * Delete a bookmark by projectId (alternative deletion method)
   */
  async removeByProjectId(projectId: string) {
    const studentId = this.contextService.getUserId();
    if (!studentId) {
      throw new AppError(
        ERROR_CODES.UNAUTHORIZED,
        'User must be authenticated',
      );
    }

    const [bookmark] = await this.db.db
      .select()
      .from(bookmarks)
      .where(
        and(
          eq(bookmarks.studentId, studentId),
          eq(bookmarks.projectId, projectId),
        ),
      )
      .limit(1);

    if (!bookmark) {
      throw new AppError(ERROR_CODES.RESOURCE_NOT_FOUND, 'Bookmark not found', {
        projectId,
      });
    }

    await this.db.db.delete(bookmarks).where(eq(bookmarks.id, bookmark.id));

    await this.notificationService.push({
      type: NotificationType.INFO,
      message: 'Removed from bookmarks',
      context: { projectId },
    });

    return { success: true, message: 'Bookmark removed successfully' };
  }

  /**
   * Bulk delete bookmarks
   */
  async bulkDelete(dto: BulkDeleteBookmarksDto) {
    const studentId = this.contextService.getUserId();
    if (!studentId) {
      throw new AppError(
        ERROR_CODES.UNAUTHORIZED,
        'User must be authenticated',
      );
    }

    // Verify all bookmarks belong to this student
    const foundBookmarks = await this.db.db
      .select()
      .from(bookmarks)
      .where(
        and(
          eq(bookmarks.studentId, studentId),
          inArray(bookmarks.id, dto.bookmarkIds),
        ),
      );

    if (foundBookmarks.length !== dto.bookmarkIds.length) {
      throw new AppError(
        ERROR_CODES.INVALID_INPUT,
        'Some bookmark IDs are invalid or do not belong to you',
      );
    }

    // Delete all bookmarks
    await this.db.db
      .delete(bookmarks)
      .where(
        and(
          eq(bookmarks.studentId, studentId),
          inArray(bookmarks.id, dto.bookmarkIds),
        ),
      );

    await this.notificationService.push({
      type: NotificationType.SUCCESS,
      message: `${dto.bookmarkIds.length} bookmarks removed successfully`,
      context: { count: dto.bookmarkIds.length },
    });

    return {
      deletedCount: dto.bookmarkIds.length,
      success: true,
      message: `Successfully deleted ${dto.bookmarkIds.length} bookmarks`,
    };
  }

  /**
   * Search bookmarks by term (returns bookmark IDs for client-side filtering)
   */
  async search(term: string): Promise<{ bookmarkIds: string[] }> {
    const studentId = this.contextService.getUserId();
    if (!studentId) {
      throw new AppError(
        ERROR_CODES.UNAUTHORIZED,
        'User must be authenticated',
      );
    }

    const results = await this.db.db
      .select({ bookmarkId: bookmarks.id })
      .from(bookmarks)
      .innerJoin(projects, eq(bookmarks.projectId, projects.id))
      .where(
        and(
          eq(bookmarks.studentId, studentId),
          or(
            ilike(projects.title, `%${term}%`),
            ilike(projects.description, `%${term}%`),
          ),
        ),
      );

    return {
      bookmarkIds: results.map((r) => r.bookmarkId),
    };
  }

  /**
   * Get bookmark count for a student
   */
  async getCount(): Promise<number> {
    const studentId = this.contextService.getUserId();
    if (!studentId) {
      return 0;
    }

    const [result] = await this.db.db
      .select({ count: count() })
      .from(bookmarks)
      .where(eq(bookmarks.studentId, studentId));

    return result?.count || 0;
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private calculateTimeRemaining(deadline: Date): string | null {
    const now = new Date();
    const diff = deadline.getTime() - now.getTime();

    if (diff <= 0) return null;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const months = Math.floor(days / 30);

    if (months > 0) {
      return `P${months}M`; // ISO8601 duration
    } else if (days > 0) {
      return `P${days}D`;
    }

    return null;
  }

  private mapDifficulty(category: string): string {
    // TODO: This should come from project metadata
    const difficultyMap: Record<string, string> = {
      web_development: 'INTERMEDIATE',
      mobile_development: 'INTERMEDIATE',
      data_science: 'ADVANCED',
      machine_learning: 'ADVANCED',
      design: 'ROOKIE',
      marketing: 'ROOKIE',
      research: 'INTERMEDIATE',
      consulting: 'INTERMEDIATE',
      other: 'INTERMEDIATE',
    };

    return difficultyMap[category] || 'INTERMEDIATE';
  }

  private formatTags(skills: string[]): string[] {
    if (skills.length <= 3) {
      return skills;
    }

    const displaySkills = skills.slice(0, 3);
    const remainingCount = skills.length - 3;
    return [...displaySkills, `+${remainingCount}`];
  }

  private mapProjectStatus(status: string): string {
    const statusMap: Record<string, string> = {
      published: 'ACTIVE',
      in_progress: 'FILLED',
      completed: 'ARCHIVED',
      cancelled: 'ARCHIVED',
      draft: 'ARCHIVED',
    };

    return statusMap[status] || 'ACTIVE';
  }
}
