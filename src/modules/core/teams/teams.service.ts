// ============================================================================
// TEAMS SERVICE (CORE CRUD)
// src/modules/core/teams/teams.service.ts
// ============================================================================

import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@database/database.service';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { teams, TeamStatus, TeamVisibility } from './models/team.model';
import { teamAssignments } from './models/team-assignment.model';
import { eq, and, or, ilike, desc, asc, count, inArray } from 'drizzle-orm';
import { ContextService } from '@modules/shared/context/context.service';
import { NotificationService } from '@modules/shared/notification/notification.service';
import { NotificationType } from '@modules/shared/notification/interfaces';
import { ERROR_CODES } from '@shared/error/constants/error-codes.constant';
import { AppError } from '@shared/error/classes/app-error.class';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { FilterTeamsDto } from './dto/filter-teams.dto';
import { AddMemberDto } from './dto/add-member.dto';

@Injectable()
export class TeamsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly contextService: ContextService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Create a new team
   */
  async create(dto: CreateTeamDto) {
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

    const [team] = await this.db.db
      .insert(teams)
      .values({
        ...dto,
        createdBy: userId,
        universityId: context.universityId,
        status: 'ACTIVE',
        visibility: dto.visibility ?? 'UNIVERSITY_ONLY',
        currentMemberCount: 0,
      })
      .returning();

    await this.db.db.insert(teamAssignments).values({
      teamId: team.id,
      userId,
      universityId: context.universityId,
      role: 'LEAD',
      status: 'ACTIVE',
      canInviteMembers: true,
      canEditTeam: true,
      canMessageClient: true,
    });

    await this.db.db
      .update(teams)
      .set({ currentMemberCount: 1 })
      .where(eq(teams.id, team.id));

    await this.notificationService.push({
      type: NotificationType.SUCCESS,
      message: `Team "${team.name}" created successfully`,
      context: { teamId: team.id },
    });

    return { ...team, currentMemberCount: 1 };
  }

  /**
   * Get all teams with filtering and pagination
   */
  async findAll(filters: FilterTeamsDto) {
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
      projectId,
      supervisorId,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters;

    const offset = (page - 1) * limit;

    const conditions = [eq(teams.universityId, context.universityId)];

    if (search) {
      conditions.push(
        or(
          ilike(teams.name, `%${search}%`),
          ilike(teams.description ?? '', `%${search}%`),
        )!,
      );
    }

    if (status) {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      conditions.push(eq(teams.status, status as TeamStatus));
    }

    if (projectId) {
      conditions.push(eq(teams.projectId, projectId));
    }

    if (supervisorId) {
      conditions.push(eq(teams.supervisorId, supervisorId));
    }

    const whereClause = and(...conditions);

    let orderByClause;
    if (sortBy === 'createdAt') {
      orderByClause =
        sortOrder === 'asc' ? asc(teams.createdAt) : desc(teams.createdAt);
    } else if (sortBy === 'name') {
      orderByClause = sortOrder === 'asc' ? asc(teams.name) : desc(teams.name);
    } else {
      orderByClause = desc(teams.createdAt);
    }

    const [items, totalResult] = await Promise.all([
      this.db.db
        .select()
        .from(teams)
        .where(whereClause)
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset),

      this.db.db.select({ count: count() }).from(teams).where(whereClause),
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
   * Find team by ID (tenant-validated)
   */
  async findById(id: string) {
    const context = this.contextService.getContext();

    if (!context.universityId) {
      throw new AppError(
        ERROR_CODES.MISSING_CONTEXT,
        'University context required',
      );
    }

    const [team] = await this.db.db
      .select()
      .from(teams)
      .where(
        and(eq(teams.id, id), eq(teams.universityId, context.universityId)),
      )
      .limit(1);

    if (!team) {
      throw new AppError(ERROR_CODES.RESOURCE_NOT_FOUND, 'Team not found', {
        teamId: id,
      });
    }

    return team;
  }

  /**
   * Find teams by student ID (for dashboard)
   */
  async findByStudentId(studentId: string) {
    const context = this.contextService.getContext();

    if (!context.universityId) {
      throw new AppError(
        ERROR_CODES.MISSING_CONTEXT,
        'University context required',
      );
    }

    const assignments = await this.db.db
      .select()
      .from(teamAssignments)
      .where(
        and(
          eq(teamAssignments.userId, studentId),
          eq(teamAssignments.universityId, context.universityId),
          eq(teamAssignments.status, 'ACTIVE'),
        ),
      );

    if (assignments.length === 0) {
      return [];
    }

    const teamIds = assignments.map((assignment) => assignment.teamId);

    const teamsList = await this.db.db
      .select()
      .from(teams)
      .where(
        and(
          eq(teams.universityId, context.universityId),
          inArray(teams.id, teamIds),
        ),
      );

    return teamsList;
  }

  /**
   * Update team (ownership check)
   */
  async update(id: string, dto: UpdateTeamDto) {
    const userId = this.contextService.getUserId();

    if (!userId) {
      throw new AppError(
        ERROR_CODES.UNAUTHORIZED,
        'User must be authenticated',
      );
    }

    const team = await this.findById(id);
    const canEdit = await this.canUserEditTeam(userId, id);

    if (!canEdit && team.createdBy !== userId) {
      throw new AppError(
        ERROR_CODES.INSUFFICIENT_PERMISSIONS,
        'You do not have permission to edit this team',
      );
    }

    const { status, visibility, ...restOfDto } = dto;
    const updateData: Partial<typeof teams.$inferInsert> = {
      ...restOfDto,
      updatedAt: new Date(),
    };

    if (status) {
      updateData.status = status;
    }
    if (visibility) {
      updateData.visibility = visibility;
    }

    const [updated] = await this.db.db
      .update(teams)
      .set(updateData)
      .where(eq(teams.id, id))
      .returning();

    await this.notificationService.push({
      type: NotificationType.SUCCESS,
      message: 'Team updated successfully',
      context: { teamId: id },
    });

    return updated;
  }

  /**
   * Add member to team
   */
  async addMember(teamId: string, dto: AddMemberDto) {
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

    const team = await this.findById(teamId);
    const canInvite = await this.canUserInviteMembers(userId, teamId);

    if (!canInvite && team.createdBy !== userId) {
      throw new AppError(
        ERROR_CODES.INSUFFICIENT_PERMISSIONS,
        'You do not have permission to add members to this team',
      );
    }

    if (team.currentMemberCount >= team.maxMembers) {
      throw new AppError(
        ERROR_CODES.OPERATION_NOT_ALLOWED,
        'Team has reached maximum capacity',
        { currentCount: team.currentMemberCount, maxMembers: team.maxMembers },
      );
    }

    const [existing] = await this.db.db
      .select()
      .from(teamAssignments)
      .where(
        and(
          eq(teamAssignments.teamId, teamId),
          eq(teamAssignments.userId, dto.userId),
          eq(teamAssignments.universityId, context.universityId),
        ),
      )
      .limit(1);

    if (existing) {
      throw new AppError(
        ERROR_CODES.ALREADY_EXISTS,
        'User is already assigned to this team',
        { teamId, userId: dto.userId },
      );
    }

    const [assignment] = await this.db.db
      .insert(teamAssignments)
      .values({
        teamId,
        userId: dto.userId,
        universityId: context.universityId,
        role: dto.role ?? 'MEMBER',
        status: 'ACTIVE',
        canInviteMembers: dto.canInviteMembers ?? false,
        canEditTeam: dto.canEditTeam ?? false,
        canMessageClient: dto.canMessageClient ?? false,
        invitedBy: userId,
      })
      .returning();

    await this.db.db
      .update(teams)
      .set({ currentMemberCount: team.currentMemberCount + 1 })
      .where(eq(teams.id, teamId));

    await this.notificationService.push({
      type: NotificationType.SUCCESS,
      message: 'Member added to team',
      context: { teamId, memberId: assignment.id },
    });

    return assignment;
  }

  private async canUserInviteMembers(userId: string, teamId: string) {
    const context = this.contextService.getContext();
    if (!context.universityId) {
      return false;
    }

    const [assignment] = await this.db.db
      .select({ canInviteMembers: teamAssignments.canInviteMembers })
      .from(teamAssignments)
      .where(
        and(
          eq(teamAssignments.userId, userId),
          eq(teamAssignments.teamId, teamId),
          eq(teamAssignments.universityId, context.universityId),
          eq(teamAssignments.status, 'ACTIVE'),
        ),
      )
      .limit(1);

    return assignment?.canInviteMembers ?? false;
  }

  private async canUserEditTeam(userId: string, teamId: string) {
    const context = this.contextService.getContext();
    if (!context.universityId) {
      return false;
    }

    const [assignment] = await this.db.db
      .select({ canEditTeam: teamAssignments.canEditTeam })
      .from(teamAssignments)
      .where(
        and(
          eq(teamAssignments.userId, userId),
          eq(teamAssignments.teamId, teamId),
          eq(teamAssignments.universityId, context.universityId),
          eq(teamAssignments.status, 'ACTIVE'),
        ),
      )
      .limit(1);

    return assignment?.canEditTeam ?? false;
  }
}
