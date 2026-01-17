// ============================================================================
// PART 4: SERVICE
// src/modules/projects/projects.service.ts
// ============================================================================

import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@database/database.service';
import {
  projects,
  ProjectStatus,
  ProjectApprovalStatus,
  ProjectCategory,
  ProjectDifficulty,
  ProjectVisibility,
  Project,
  NewProject,
} from './models/project.model';
import { clients } from '@modules/core/auth/models/user.model';
import {
  eq,
  and,
  or,
  ilike,
  desc,
  asc,
  isNull,
  count,
  sql,
  lt,
} from 'drizzle-orm';
import { ContextService } from '@modules/shared/context/context.service';
import { NotificationService } from '@modules/shared/notification/notification.service';
import { NotificationType } from '@modules/shared/notification/interfaces';
import { ERROR_CODES } from '@shared/error/constants/error-codes.constant';
import { AppError } from '@shared/error/classes/app-error.class';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { FilterProjectsDto } from './dto/filter-projects.dto';
import {
  CursorPaginationInput,
  ProjectFeedFilterInput,
} from './dto/student-feed.dto';
import {
  ProjectCardEntity,
  ProjectFiltersMetaEntity,
  StudentProjectFeedResponse,
  ProjectPageInfo,
  StudentProjectFeedSearchResult,
} from './entities/project.entity';
import { SQL } from 'drizzle-orm';

const validSortFields = [
  'createdAt',
  'updatedAt',
  'title',
  'status',
  'category',
  'publishedAt',
  'deadline',
  'viewCount',
  'applicationCount',
] as const;

type SortableFields = (typeof validSortFields)[number];

@Injectable()
export class ProjectsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly contextService: ContextService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Create a new project (Draft by default)
   */
  async create(dto: CreateProjectDto) {
    const userId = this.contextService.getUserId();
    if (!userId) {
      throw new AppError(
        ERROR_CODES.UNAUTHORIZED,
        'User must be authenticated',
      );
    }
    const { universityId } = this.contextService.getContext();
    if (!universityId) {
      throw new AppError(
        ERROR_CODES.MISSING_CONTEXT,
        'University context required',
      );
    }

    // Get client profile for this user
    const [client] = await this.db.db
      .select()
      .from(clients)
      .where(eq(clients.userId, userId))
      .limit(1);

    if (!client) {
      throw new AppError(
        ERROR_CODES.INSUFFICIENT_PERMISSIONS,
        'Only clients can create projects',
      );
    }

    const insertData: NewProject = {
      clientId: client.id,
      universityId,
      createdBy: userId,
      title: dto.title,
      description: dto.description,
      organization: dto.organization,
      organizationLogoUrl: dto.organizationLogoUrl,
      objectives: dto.objectives,
      deliverables: dto.deliverables,
      requiredSkills: dto.requiredSkills,
      preferredSkills: dto.preferredSkills,
      experienceLevel: dto.experienceLevel,
      learnerRequirements: dto.learnerRequirements,
      expectedOutcomes: dto.expectedOutcomes,
      additionalResources: dto.additionalResources,
      contactPersons: dto.contactPersons,
      duration: dto.duration,
      startDate: dto.startDate,
      deadline: dto.deadline,
      isFlexibleTimeline: dto.isFlexibleTimeline ?? false,
      teamSize: dto.teamSize ?? 1,
      maxApplicants: dto.maxApplicants,
      status: 'draft',
      approvalStatus: 'pending',
      category: dto.category as ProjectCategory,
      tags: dto.tags,
      industry: dto.industry,
      isPublished: false,
      isRemote: dto.isRemote ?? false,
      location: dto.location,
      budget: dto.budget,
      compensationType: dto.compensationType,
      difficulty: dto.difficulty as ProjectDifficulty | undefined,
      visibility: dto.visibility as ProjectVisibility | undefined,
      confidential: dto.confidential ?? false,
    };

    const [project] = await this.db.db
      .insert(projects)
      .values(insertData)
      .returning();

    await this.notificationService.push({
      type: NotificationType.SUCCESS,
      message:
        'Project created successfully! It will be reviewed before publishing.',
      context: { projectId: project.id },
    });

    return project;
  }

  /**
   * Find project by ID with tenant validation.
   * Does NOT increment view count (use findOne for that).
   */
  async findById(id: string): Promise<Project> {
    const { universityId } = this.contextService.getContext();
    if (!universityId) {
      throw new AppError(
        ERROR_CODES.MISSING_CONTEXT,
        'University context required',
      );
    }

    const [project] = await this.db.db
      .select()
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.universityId, universityId)))
      .limit(1);

    if (!project) {
      throw new AppError(ERROR_CODES.RESOURCE_NOT_FOUND, 'Project not found', {
        projectId: id,
        universityId,
      });
    }

    return project;
  }

  /**
   * Get all projects with filtering, search, and pagination
   */
  async findAll(filters: FilterProjectsDto) {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      approvalStatus,
      category,
      requiredSkills,
      tags,
      industry,
      isRemote,
      isPublished,
      isAvailable,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters;

    const offset = (page - 1) * limit;

    // Build WHERE conditions
    const conditions = [];

    // Search in title and description
    if (search) {
      conditions.push(
        or(
          ilike(projects.title, `%${search}%`),
          ilike(projects.description, `%${search}%`),
        ),
      );
    }

    if (status) {
      conditions.push(eq(projects.status, status as ProjectStatus));
    }

    if (approvalStatus) {
      conditions.push(
        eq(projects.approvalStatus, approvalStatus as ProjectApprovalStatus),
      );
    }

    if (category) {
      conditions.push(eq(projects.category, category as ProjectCategory));
    }

    if (industry) {
      conditions.push(eq(projects.industry, industry));
    }

    if (isRemote !== undefined) {
      conditions.push(eq(projects.isRemote, isRemote));
    }

    if (isPublished !== undefined) {
      conditions.push(eq(projects.isPublished, isPublished));
    }

    if (isAvailable) {
      conditions.push(isNull(projects.assignedTeamId));
    }

    // Skills filtering (array contains)
    if (requiredSkills && requiredSkills.length > 0) {
      conditions.push(
        sql`${projects.requiredSkills}::jsonb @> ${JSON.stringify(requiredSkills)}::jsonb`,
      );
    }

    // Tags filtering
    if (tags && tags.length > 0) {
      conditions.push(
        sql`${projects.tags}::jsonb @> ${JSON.stringify(tags)}::jsonb`,
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Sorting
    const sortField = validSortFields.includes(sortBy as SortableFields)
      ? (sortBy as SortableFields)
      : 'createdAt';

    // Type-safe sorting based on field
    let orderByClause;
    switch (sortField) {
      case 'createdAt':
        orderByClause =
          sortOrder === 'asc'
            ? asc(projects.createdAt)
            : desc(projects.createdAt);
        break;
      case 'updatedAt':
        orderByClause =
          sortOrder === 'asc'
            ? asc(projects.updatedAt)
            : desc(projects.updatedAt);
        break;
      case 'title':
        orderByClause =
          sortOrder === 'asc' ? asc(projects.title) : desc(projects.title);
        break;
      case 'status':
        orderByClause =
          sortOrder === 'asc' ? asc(projects.status) : desc(projects.status);
        break;
      case 'category':
        orderByClause =
          sortOrder === 'asc'
            ? asc(projects.category)
            : desc(projects.category);
        break;
      case 'publishedAt':
        orderByClause =
          sortOrder === 'asc'
            ? asc(projects.publishedAt)
            : desc(projects.publishedAt);
        break;
      case 'deadline':
        orderByClause =
          sortOrder === 'asc'
            ? asc(projects.deadline)
            : desc(projects.deadline);
        break;
      case 'viewCount':
        orderByClause =
          sortOrder === 'asc'
            ? asc(projects.viewCount)
            : desc(projects.viewCount);
        break;
      case 'applicationCount':
        orderByClause =
          sortOrder === 'asc'
            ? asc(projects.applicationCount)
            : desc(projects.applicationCount);
        break;
      default:
        orderByClause = desc(projects.createdAt);
    }

    // Execute queries
    const [items, totalResult] = await Promise.all([
      this.db.db
        .select()
        .from(projects)
        .where(whereClause)
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset),

      this.db.db.select({ count: count() }).from(projects).where(whereClause),
    ]);

    const total = Number(totalResult[0]?.count || 0);
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
   * Student project feed (cursor-based, foundational)
   */
  /**
   * Student project feed (cursor-based, foundational)
   */
  async studentProjectFeed(
    studentId: string,
    filters: ProjectFeedFilterInput = {},
    pagination: CursorPaginationInput = {},
  ): Promise<StudentProjectFeedResponse> {
    const userId = this.contextService.getUserId();
    if (!userId) {
      throw new AppError(
        ERROR_CODES.UNAUTHORIZED,
        'User must be authenticated',
      );
    }

    const conditions = [
      eq(projects.isPublished, true),
      eq(projects.approvalStatus, 'approved' as ProjectApprovalStatus),
    ];

    if (filters.search) {
      conditions.push(
        or(
          ilike(projects.title, `%${filters.search}%`),
          ilike(projects.organization ?? projects.title, `%${filters.search}%`),
          ilike(projects.description, `%${filters.search}%`),
        )!,
      );
    }

    if (filters.categories?.length) {
      conditions.push(sql`${projects.category} = ANY(${filters.categories})`);
    }

    if (filters.skills?.length) {
      conditions.push(
        sql`${projects.requiredSkills}::jsonb @> ${JSON.stringify(filters.skills)}::jsonb`,
      );
    }

    const limit = pagination.limit ?? 9;
    const limitPlusOne = limit + 1;
    if (pagination.cursor) {
      const cursorDate = new Date(pagination.cursor);
      if (!Number.isNaN(cursorDate.getTime())) {
        conditions.push(lt(projects.createdAt, cursorDate));
      }
    }

    let orderByClause;
    switch (filters.sort) {
      case 'DEADLINE_SOON':
        conditions.push(sql`${projects.deadline} IS NOT NULL`);
        orderByClause = asc(projects.deadline);
        break;
      case 'OLDEST_FIRST':
        orderByClause = asc(projects.createdAt);
        break;
      case 'NEWEST_FIRST':
      case 'MATCH_SCORE':
      default:
        orderByClause = desc(projects.createdAt);
        break;
    }

    const whereClause = and(...conditions)!;

    const rows = await this.db.db
      .select()
      .from(projects)
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(limitPlusOne);

    const hasNextPage = rows.length > limit;
    const sliced = hasNextPage ? rows.slice(0, limit) : rows;
    const endCursor =
      sliced.length > 0
        ? sliced[sliced.length - 1].createdAt?.toISOString()
        : undefined;

    const cards = sliced.map((p) => this.mapProjectToCard(p));
    const filtersMeta = await this.buildFiltersMeta(whereClause);

    const pageInfo: ProjectPageInfo = { hasNextPage, endCursor };

    return { cards, filtersMeta, pageInfo };
  }
  async studentProjectFeedSearch(
    studentId: string,
    term: string,
  ): Promise<StudentProjectFeedSearchResult> {
    const userId = this.contextService.getUserId();
    if (!userId) {
      throw new AppError(
        ERROR_CODES.UNAUTHORIZED,
        'User must be authenticated',
      );
    }

    const whereClause = and(
      eq(projects.isPublished, true),
      eq(projects.approvalStatus, 'approved' as ProjectApprovalStatus),
      or(
        ilike(projects.title, `%${term}%`),
        ilike(projects.organization ?? projects.title, `%${term}%`),
        ilike(projects.description, `%${term}%`),
      ),
    );

    const rows = await this.db.db
      .select({ id: projects.id })
      .from(projects)
      .where(whereClause)
      .limit(50);

    return { cardIds: rows.map((r) => r.id) };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  private mapProjectToCard(project: Project): ProjectCardEntity {
    const summary =
      project.description?.slice(0, 180)?.trimEnd() +
      (project.description && project.description.length > 180 ? '…' : '');

    const skills = (project.requiredSkills || []).slice(0, 6);
    const tags = this.computeTags(project.tags || []);
    const timeRemaining = this.computeTimeRemaining(project.deadline);

    return {
      id: project.id,
      title: project.title,
      organization: project.organization ?? undefined,
      organizationLogoUrl: project.organizationLogoUrl ?? undefined,
      summary,
      skills,
      difficulty: project.difficulty ?? undefined,
      category: project.category,
      tags,
      matchScore: undefined,
      postedAt: project.createdAt,
      timeRemaining,
    };
  }

  private computeTags(tags: string[]): string[] {
    if (!tags?.length) return [];
    if (tags.length <= 4) return tags;
    const visible = tags.slice(0, 3);
    const remaining = tags.length - 3;
    return [...visible, `+${remaining}`];
  }

  private computeTimeRemaining(deadline?: Date | null): string | undefined {
    if (!deadline) return undefined;
    const now = new Date();
    if (deadline <= now) return 'P0D';
    const diffMs = deadline.getTime() - now.getTime();
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return `P${days}D`;
  }

  private async buildFiltersMeta(
    whereClause: SQL<unknown>, // Changed from ReturnType<typeof and>
  ): Promise<ProjectFiltersMetaEntity> {
    const categoriesRows = await this.db.db
      .select({ category: projects.category })
      .from(projects)
      .where(whereClause)
      .groupBy(projects.category);

    const skillsRows = await this.db.db
      .select({ skills: projects.requiredSkills })
      .from(projects)
      .where(whereClause)
      .limit(200);

    const availableCategories = [
      ...new Set(categoriesRows.map((row) => row.category)),
    ];

    const availableSkills = [
      ...new Set(skillsRows.flatMap((row) => row.skills ?? [])),
    ].slice(0, 100);

    return {
      availableCategories,
      availableSkills,
      defaultSort: 'MATCH_SCORE',
    };
  }

  /**
   * Get a single project by ID
   */
  async findOne(id: string) {
    const [project] = await this.db.db
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1);

    if (!project) {
      throw new AppError(ERROR_CODES.RESOURCE_NOT_FOUND, 'Project not found', {
        projectId: id,
      });
    }

    // Increment view count
    await this.db.db
      .update(projects)
      .set({ viewCount: (project.viewCount || 0) + 1 })
      .where(eq(projects.id, id));

    return { ...project, viewCount: (project.viewCount || 0) + 1 };
  }

  /**
   * Update a project
   */
  async update(id: string, dto: UpdateProjectDto) {
    const userId = this.contextService.getUserId();
    if (!userId) {
      throw new AppError(
        ERROR_CODES.UNAUTHORIZED,
        'User must be authenticated',
      );
    }

    // Verify ownership
    const [existingProject] = await this.db.db
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1);

    if (!existingProject) {
      throw new AppError(ERROR_CODES.RESOURCE_NOT_FOUND, 'Project not found', {
        projectId: id,
      });
    }

    if (existingProject.createdBy !== userId) {
      throw new AppError(
        ERROR_CODES.INSUFFICIENT_PERMISSIONS,
        'You can only update your own projects',
      );
    }

    // Create properly typed update object
    const { category, status, difficulty, visibility, ...restOfDto } = dto;
    const updateData: Partial<typeof projects.$inferInsert> = {
      ...restOfDto,
      updatedAt: new Date(),
    };

    // Handle enum type conversions if provided
    if (category) {
      updateData.category = category as ProjectCategory;
    }
    if (status) {
      updateData.status = status as ProjectStatus;
    }
    if (difficulty) {
      updateData.difficulty = difficulty as ProjectDifficulty;
    }
    if (visibility) {
      updateData.visibility = visibility as ProjectVisibility;
    }

    const [updated] = await this.db.db
      .update(projects)
      .set(updateData)
      .where(eq(projects.id, id))
      .returning();

    await this.notificationService.push({
      type: NotificationType.SUCCESS,
      message: 'Project updated successfully',
      context: { projectId: id },
    });

    return updated;
  }

  /**
   * Delete a project
   */
  async remove(id: string) {
    const userId = this.contextService.getUserId();
    if (!userId) {
      throw new AppError(
        ERROR_CODES.UNAUTHORIZED,
        'User must be authenticated',
      );
    }

    // Verify ownership
    const [existingProject] = await this.db.db
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1);

    if (!existingProject) {
      throw new AppError(ERROR_CODES.RESOURCE_NOT_FOUND, 'Project not found', {
        projectId: id,
      });
    }

    if (existingProject.createdBy !== userId) {
      throw new AppError(
        ERROR_CODES.INSUFFICIENT_PERMISSIONS,
        'You can only delete your own projects',
      );
    }

    // Don't allow deletion if assigned to a team
    if (existingProject.assignedTeamId) {
      throw new AppError(
        ERROR_CODES.OPERATION_NOT_ALLOWED,
        'Cannot delete a project that is assigned to a team',
        { projectId: id },
      );
    }

    await this.db.db.delete(projects).where(eq(projects.id, id));

    await this.notificationService.push({
      type: NotificationType.INFO,
      message: 'Project deleted successfully',
      context: { projectId: id },
    });

    return { success: true, message: 'Project deleted' };
  }

  /**
   * Publish a project (requires approval)
   */
  async publish(id: string) {
    const userId = this.contextService.getUserId();
    if (!userId) {
      throw new AppError(
        ERROR_CODES.UNAUTHORIZED,
        'User must be authenticated',
      );
    }

    const [project] = await this.db.db
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1);

    if (!project) {
      throw new AppError(ERROR_CODES.RESOURCE_NOT_FOUND, 'Project not found');
    }

    if (project.createdBy !== userId) {
      throw new AppError(
        ERROR_CODES.INSUFFICIENT_PERMISSIONS,
        'You can only publish your own projects',
      );
    }

    if (project.approvalStatus !== 'approved') {
      throw new AppError(
        ERROR_CODES.OPERATION_NOT_ALLOWED,
        'Project must be approved before publishing',
      );
    }

    const [published] = await this.db.db
      .update(projects)
      .set({
        status: 'published',
        isPublished: true,
        publishedAt: new Date(),
      })
      .where(eq(projects.id, id))
      .returning();

    await this.notificationService.push({
      type: NotificationType.SUCCESS,
      message:
        'Project published successfully! Students can now view and apply.',
      context: { projectId: id },
    });

    return published;
  }

  /**
   * Approve a project (Supervisor/University only)
   */
  async approve(id: string) {
    const userId = this.contextService.getUserId();
    if (!userId) {
      throw new AppError(
        ERROR_CODES.UNAUTHORIZED,
        'User must be authenticated',
      );
    }

    // TODO: Add role check for supervisor/university
    // This will be implemented once we have role-based guards

    const [approved] = await this.db.db
      .update(projects)
      .set({
        approvalStatus: 'approved',
        approvedBy: userId,
        approvedAt: new Date(),
      })
      .where(eq(projects.id, id))
      .returning();

    if (!approved) {
      throw new AppError(ERROR_CODES.RESOURCE_NOT_FOUND, 'Project not found');
    }

    await this.notificationService.push({
      type: NotificationType.SUCCESS,
      message: 'Project approved! Client can now publish it.',
      context: { projectId: id },
    });

    return approved;
  }

  /**
   * Assign project to a team
   */
  async assignTeam(projectId: string, teamId: string) {
    const [project] = await this.db.db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project) {
      throw new AppError(ERROR_CODES.RESOURCE_NOT_FOUND, 'Project not found');
    }

    if (project.assignedTeamId) {
      throw new AppError(
        ERROR_CODES.OPERATION_NOT_ALLOWED,
        'Project is already assigned to a team',
      );
    }

    const [assigned] = await this.db.db
      .update(projects)
      .set({
        assignedTeamId: teamId,
        assignedAt: new Date(),
        status: 'in_progress',
      })
      .where(eq(projects.id, projectId))
      .returning();

    await this.notificationService.push({
      type: NotificationType.SUCCESS,
      message: 'Team assigned to project successfully!',
      context: { projectId, teamId },
    });

    return assigned;
  }

  /**
   * Get projects for the current client
   */
  async getMyProjects(filters: FilterProjectsDto) {
    const userId = this.contextService.getUserId();
    if (!userId) {
      throw new AppError(
        ERROR_CODES.UNAUTHORIZED,
        'User must be authenticated',
      );
    }

    const [client] = await this.db.db
      .select()
      .from(clients)
      .where(eq(clients.userId, userId))
      .limit(1);

    if (!client) {
      throw new AppError(
        ERROR_CODES.INSUFFICIENT_PERMISSIONS,
        'Only clients can view their projects',
      );
    }

    const { page = 1, limit = 10 } = filters;
    const offset = (page - 1) * limit;

    const [items, totalResult] = await Promise.all([
      this.db.db
        .select()
        .from(projects)
        .where(eq(projects.clientId, client.id))
        .orderBy(desc(projects.createdAt))
        .limit(limit)
        .offset(offset),

      this.db.db
        .select({ count: count() })
        .from(projects)
        .where(eq(projects.clientId, client.id)),
    ]);

    const total = Number(totalResult[0]?.count || 0);
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
}
