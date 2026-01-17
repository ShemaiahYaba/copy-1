// ============================================================================
// EXPERIENCES SERVICE (CORE CRUD)
// src/modules/core/experiences/experiences.service.ts
// ============================================================================

import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@database/database.service';
import { experiences, ExperienceStatus } from './models/experience.model';
import { eq, and, or, ilike, desc, asc, count } from 'drizzle-orm';
import { ContextService } from '@modules/shared/context/context.service';
import { NotificationService } from '@modules/shared/notification/notification.service';
import { NotificationType } from '@modules/shared/notification/interfaces';
import { ERROR_CODES } from '@shared/error/constants/error-codes.constant';
import { AppError } from '@shared/error/classes/app-error.class';
import { CreateExperienceDto } from './dto/create-experience.dto';
import { UpdateExperienceDto } from './dto/update-experience.dto';
import { FilterExperiencesDto } from './dto/filter-experiences.dto';

@Injectable()
export class ExperiencesService {
  constructor(
    private readonly db: DatabaseService,
    private readonly contextService: ContextService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Create a new experience (DRAFT by default)
   */
  async create(dto: CreateExperienceDto) {
    const userId = this.contextService.getUserId();
    const context = this.contextService.getContext();

    if (!userId) {
      throw new AppError(
        ERROR_CODES.UNAUTHORIZED,
        'User must be authenticated',
      );
    }

    if (!context.universityId) {
      throw new AppError(
        ERROR_CODES.MISSING_CONTEXT,
        'University context required',
      );
    }

    const durationWeeks =
      dto.durationWeeks ??
      Math.ceil(
        (dto.endDate.getTime() - dto.startDate.getTime()) /
          (1000 * 60 * 60 * 24 * 7),
      );

    const [experience] = await this.db.db
      .insert(experiences)
      .values({
        ...dto,
        createdBy: userId,
        universityId: context.universityId,
        durationWeeks,
        status: 'DRAFT',
      })
      .returning();

    await this.notificationService.push({
      type: NotificationType.SUCCESS,
      message: 'Experience created successfully',
      context: { experienceId: experience.id },
    });

    return experience;
  }

  /**
   * Get all experiences with filtering and pagination
   */
  async findAll(filters: FilterExperiencesDto) {
    const context = this.contextService.getContext();

    if (!context.universityId) {
      throw new AppError(
        ERROR_CODES.MISSING_CONTEXT,
        'University context required',
      );
    }

    const {
      page = 1,
      limit = 10,
      search,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters;

    const offset = (page - 1) * limit;

    const conditions = [eq(experiences.universityId, context.universityId)];

    if (search) {
      conditions.push(
        or(
          ilike(experiences.title, `%${search}%`),
          ilike(experiences.overview, `%${search}%`),
          ilike(experiences.courseCode ?? '', `%${search}%`),
        )!,
      );
    }

    if (status) {
      conditions.push(eq(experiences.status, status as ExperienceStatus));
    }

    const whereClause = and(...conditions);

    let orderByClause;
    if (sortBy === 'createdAt') {
      orderByClause =
        sortOrder === 'asc'
          ? asc(experiences.createdAt)
          : desc(experiences.createdAt);
    } else if (sortBy === 'title') {
      orderByClause =
        sortOrder === 'asc' ? asc(experiences.title) : desc(experiences.title);
    } else {
      orderByClause = desc(experiences.createdAt);
    }

    const [items, totalResult] = await Promise.all([
      this.db.db
        .select()
        .from(experiences)
        .where(whereClause)
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset),

      this.db.db
        .select({ count: count() })
        .from(experiences)
        .where(whereClause),
    ]);

    const total = totalResult[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      items,
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }

  /**
   * Find experience by ID (tenant-validated)
   */
  async findById(id: string) {
    const context = this.contextService.getContext();

    if (!context.universityId) {
      throw new AppError(
        ERROR_CODES.MISSING_CONTEXT,
        'University context required',
      );
    }

    const [experience] = await this.db.db
      .select()
      .from(experiences)
      .where(
        and(
          eq(experiences.id, id),
          eq(experiences.universityId, context.universityId),
        ),
      )
      .limit(1);

    if (!experience) {
      throw new AppError(
        ERROR_CODES.RESOURCE_NOT_FOUND,
        'Experience not found',
        { experienceId: id },
      );
    }

    return experience;
  }

  /**
   * Update experience (ownership check)
   */
  async update(id: string, dto: UpdateExperienceDto) {
    const userId = this.contextService.getUserId();

    if (!userId) {
      throw new AppError(
        ERROR_CODES.UNAUTHORIZED,
        'User must be authenticated',
      );
    }

    const existing = await this.findById(id);

    if (existing.createdBy !== userId) {
      throw new AppError(
        ERROR_CODES.INSUFFICIENT_PERMISSIONS,
        'You can only update your own experiences',
      );
    }

    const { status, ...rest } = dto;
    const updateData: Partial<typeof experiences.$inferInsert> = {
      ...rest,
      updatedAt: new Date(),
    };

    if (status) {
      updateData.status = status;
    }

    const [updated] = await this.db.db
      .update(experiences)
      .set(updateData)
      .where(eq(experiences.id, id))
      .returning();

    await this.notificationService.push({
      type: NotificationType.SUCCESS,
      message: 'Experience updated successfully',
      context: { experienceId: id },
    });

    return updated;
  }

  /**
   * Publish experience (status transition)
   */
  async publish(id: string) {
    const userId = this.contextService.getUserId();

    if (!userId) {
      throw new AppError(
        ERROR_CODES.UNAUTHORIZED,
        'User must be authenticated',
      );
    }

    const existing = await this.findById(id);

    if (existing.createdBy !== userId) {
      throw new AppError(
        ERROR_CODES.INSUFFICIENT_PERMISSIONS,
        'You can only publish your own experiences',
      );
    }
    if (
      !existing.overview ||
      !existing.expectedOutcomes ||
      !existing.mainContact
    ) {
      throw new AppError(
        ERROR_CODES.INVALID_INPUT,
        'Experience must have overview, outcomes, and contact before publishing',
      );
    }

    const [published] = await this.db.db
      .update(experiences)
      .set({
        status: 'PUBLISHED',
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(experiences.id, id))
      .returning();

    await this.notificationService.push({
      type: NotificationType.SUCCESS,
      message: 'Experience published successfully',
      context: { experienceId: id },
    });

    return published;
  }

  /**
   * Archive experience (soft delete)
   */
  async archive(id: string) {
    const userId = this.contextService.getUserId();

    if (!userId) {
      throw new AppError(
        ERROR_CODES.UNAUTHORIZED,
        'User must be authenticated',
      );
    }

    const existing = await this.findById(id);

    if (existing.createdBy !== userId) {
      throw new AppError(
        ERROR_CODES.INSUFFICIENT_PERMISSIONS,
        'You can only archive your own experiences',
      );
    }

    const [archived] = await this.db.db
      .update(experiences)
      .set({
        status: 'ARCHIVED',
        archivedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(experiences.id, id))
      .returning();

    await this.notificationService.push({
      type: NotificationType.INFO,
      message: 'Experience archived',
      context: { experienceId: id },
    });

    return archived;
  }

  /**
   * Delete experience (only drafts)
   */
  async delete(id: string) {
    const userId = this.contextService.getUserId();

    if (!userId) {
      throw new AppError(
        ERROR_CODES.UNAUTHORIZED,
        'User must be authenticated',
      );
    }

    const existing = await this.findById(id);

    if (existing.createdBy !== userId) {
      throw new AppError(
        ERROR_CODES.INSUFFICIENT_PERMISSIONS,
        'You can only delete your own experiences',
      );
    }

    if (existing.status !== 'DRAFT') {
      throw new AppError(
        ERROR_CODES.OPERATION_NOT_ALLOWED,
        'Only draft experiences can be deleted',
      );
    }

    await this.db.db.delete(experiences).where(eq(experiences.id, id));

    await this.notificationService.push({
      type: NotificationType.INFO,
      message: 'Experience deleted',
      context: { experienceId: id },
    });

    return { success: true, message: 'Experience deleted' };
  }
}
