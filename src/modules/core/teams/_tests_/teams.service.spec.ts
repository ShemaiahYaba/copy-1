/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// ============================================================================
// TEAMS SERVICE TESTS
// src/modules/core/teams/_tests_/teams.service.spec.ts
// ============================================================================

import { Test, TestingModule } from '@nestjs/testing';
import { TeamsService } from '../teams.service';
import { DatabaseService } from '@database/database.service';
import { ContextService } from '@modules/shared/context/context.service';
import { NotificationService } from '@modules/shared/notification/notification.service';
import { AppError } from '@shared/error/classes/app-error.class';

describe('TeamsService', () => {
  let service: TeamsService;
  let mockDb: jest.Mocked<DatabaseService>;
  let mockContext: jest.Mocked<ContextService>;
  let mockNotification: jest.Mocked<NotificationService>;

  const mockUserId = 'user-123';
  const mockUniversityId = 'univ-456';

  beforeEach(async () => {
    mockDb = {
      db: {
        select: jest.fn(),
        insert: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    } as any;

    mockContext = {
      getUserId: jest.fn().mockReturnValue(mockUserId),
      getContext: jest.fn().mockReturnValue({
        userId: mockUserId,
        universityId: mockUniversityId,
      }),
    } as any;

    mockNotification = {
      push: jest.fn().mockResolvedValue(undefined),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamsService,
        { provide: DatabaseService, useValue: mockDb },
        { provide: ContextService, useValue: mockContext },
        { provide: NotificationService, useValue: mockNotification },
      ],
    }).compile();

    service = module.get<TeamsService>(TeamsService);
  });

  describe('multi-tenancy & context', () => {
    it('should throw when universityId is missing in findAll', async () => {
      mockContext.getContext = jest
        .fn()
        .mockReturnValue({ userId: mockUserId });

      await expect(service.findAll({} as any)).rejects.toThrow(AppError);
    });
  });

  describe('create', () => {
    it('should create team and lead assignment', async () => {
      const dto = { name: 'Team Alpha' };
      const team = {
        id: 'team-1',
        name: 'Team Alpha',
        currentMemberCount: 0,
      };
      const assignment = { id: 'assign-1', teamId: 'team-1' };

      mockDb.db.insert = jest
        .fn()
        .mockReturnValueOnce({
          values: jest.fn().mockReturnThis(),
          returning: jest.fn().mockResolvedValue([team]),
        })
        .mockReturnValueOnce({
          values: jest.fn().mockReturnThis(),
          returning: jest.fn().mockResolvedValue([assignment]),
        });

      mockDb.db.update = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(undefined),
      });

      const result = await service.create(dto as any);

      expect(result.currentMemberCount).toBe(1);
      expect(mockNotification.push).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('Team') }),
      );
    });

    it('should throw when university context missing', async () => {
      mockContext.getContext = jest
        .fn()
        .mockReturnValue({ userId: mockUserId });

      await expect(service.create({ name: 'Team' } as any)).rejects.toThrow(
        'University context required',
      );
    });

    it('should throw when user not authenticated', async () => {
      mockContext.getUserId = jest.fn().mockReturnValue(null);

      await expect(service.create({ name: 'Team' } as any)).rejects.toThrow(
        'User must be authenticated',
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated teams', async () => {
      const items = [{ id: 'team-1' }];

      mockDb.db.select = jest
        .fn()
        .mockImplementationOnce(() => ({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          offset: jest.fn().mockResolvedValue(items),
        }))
        .mockImplementationOnce(() => ({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockResolvedValue([{ count: 1 }]),
        }));

      const result = await service.findAll({ page: 1, limit: 1 } as any);

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should apply filters and sorting', async () => {
      const whereMock = jest.fn().mockReturnThis();
      const orderByMock = jest.fn().mockReturnThis();

      mockDb.db.select = jest
        .fn()
        .mockImplementationOnce(() => ({
          from: jest.fn().mockReturnThis(),
          where: whereMock,
          orderBy: orderByMock,
          limit: jest.fn().mockReturnThis(),
          offset: jest.fn().mockResolvedValue([]),
        }))
        .mockImplementationOnce(() => ({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockResolvedValue([{ count: 0 }]),
        }));

      const result = await service.findAll({
        search: 'alpha',
        status: 'ACTIVE',
        projectId: 'proj-1',
        supervisorId: 'sup-1',
        sortBy: 'name',
        sortOrder: 'asc',
      } as any);

      expect(result.total).toBe(0);
      expect(whereMock).toHaveBeenCalled();
      expect(orderByMock).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should throw when universityId missing', async () => {
      mockContext.getContext = jest
        .fn()
        .mockReturnValue({ userId: mockUserId });

      await expect(service.findById('team-1')).rejects.toThrow(
        'University context required',
      );
    });

    it('should return team by ID', async () => {
      const team = { id: 'team-1' };

      mockDb.db.select = jest.fn().mockImplementation(() => ({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([team]),
      }));

      const result = await service.findById('team-1');

      expect(result).toEqual(team);
    });

    it('should throw if team not found', async () => {
      mockDb.db.select = jest.fn().mockImplementation(() => ({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      }));

      await expect(service.findById('team-404')).rejects.toThrow(
        'Team not found',
      );
    });
  });

  describe('findByStudentId', () => {
    it('should throw when universityId missing', async () => {
      mockContext.getContext = jest
        .fn()
        .mockReturnValue({ userId: mockUserId });

      await expect(service.findByStudentId('student-1')).rejects.toThrow(
        'University context required',
      );
    });

    it('should return teams for student', async () => {
      const assignments = [{ teamId: 'team-1', userId: 'student-1' }];
      const teams = [{ id: 'team-1' }];

      mockDb.db.select = jest
        .fn()
        .mockImplementationOnce(() => ({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockResolvedValue(assignments),
        }))
        .mockImplementationOnce(() => ({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockResolvedValue(teams),
        }));

      const result = await service.findByStudentId('student-1');

      expect(result).toEqual(teams);
    });

    it('should return empty if no assignments', async () => {
      mockDb.db.select = jest.fn().mockImplementation(() => ({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([]),
      }));

      const result = await service.findByStudentId('student-1');

      expect(result).toEqual([]);
    });
  });

  describe('update', () => {
    it('should throw when user not authenticated', async () => {
      mockContext.getUserId = jest.fn().mockReturnValue(null);

      await expect(
        service.update('team-1', { name: 'Updated' } as any),
      ).rejects.toThrow('User must be authenticated');
    });

    it('should allow update when user is creator even if canEdit false', async () => {
      const team = { id: 'team-1', createdBy: mockUserId };
      const updated = { id: 'team-1', name: 'Updated' };

      mockDb.db.select = jest
        .fn()
        .mockImplementationOnce(() => ({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue([team]),
        }))
        .mockImplementationOnce(() => ({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue([{ canEditTeam: false }]),
        }));

      mockDb.db.update = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([updated]),
      });

      const result = await service.update('team-1', { name: 'Updated' } as any);

      expect(result).toEqual(updated);
    });

    it('should update when canEditTeam is true', async () => {
      const team = { id: 'team-1', createdBy: 'other-user' };
      const updated = { id: 'team-1', name: 'Updated' };

      mockDb.db.select = jest
        .fn()
        .mockImplementationOnce(() => ({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue([team]),
        }))
        .mockImplementationOnce(() => ({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue([{ canEditTeam: true }]),
        }));

      mockDb.db.update = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([updated]),
      });

      const result = await service.update('team-1', { name: 'Updated' } as any);

      expect(result).toEqual(updated);
    });

    it('should update status and visibility when provided', async () => {
      const team = { id: 'team-1', createdBy: mockUserId };
      const updated = {
        id: 'team-1',
        status: 'INACTIVE',
        visibility: 'PUBLIC',
      };
      const setMock = jest.fn().mockReturnThis();

      mockDb.db.select = jest
        .fn()
        .mockImplementationOnce(() => ({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue([team]),
        }))
        .mockImplementationOnce(() => ({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue([{ canEditTeam: false }]),
        }));

      mockDb.db.update = jest.fn().mockReturnValue({
        set: setMock,
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([updated]),
      });

      const result = await service.update('team-1', {
        status: 'INACTIVE',
        visibility: 'PUBLIC',
      } as any);

      expect(result).toEqual(updated);
      expect(setMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'INACTIVE',
          visibility: 'PUBLIC',
          updatedAt: expect.any(Date),
        }),
      );
      expect(mockNotification.push).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Team updated successfully' }),
      );
    });

    it('should throw when no edit permission', async () => {
      const team = { id: 'team-1', createdBy: 'other-user' };

      mockDb.db.select = jest
        .fn()
        .mockImplementationOnce(() => ({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue([team]),
        }))
        .mockImplementationOnce(() => ({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue([{ canEditTeam: false }]),
        }));

      await expect(
        service.update('team-1', { name: 'Updated' } as any),
      ).rejects.toThrow('You do not have permission to edit this team');
    });
  });

  describe('addMember', () => {
    it('should throw when user not authenticated', async () => {
      mockContext.getUserId = jest.fn().mockReturnValue(null);

      await expect(
        service.addMember('team-1', { userId: 'user-999' } as any),
      ).rejects.toThrow('User must be authenticated');
    });

    it('should throw when university context missing', async () => {
      mockContext.getContext = jest
        .fn()
        .mockReturnValue({ userId: mockUserId });

      await expect(
        service.addMember('team-1', { userId: 'user-999' } as any),
      ).rejects.toThrow('University context required');
    });

    it('should add member when invited', async () => {
      const team = {
        id: 'team-1',
        createdBy: 'other-user',
        currentMemberCount: 1,
        maxMembers: 5,
      };
      const assignment = { id: 'assign-1', teamId: 'team-1' };

      mockDb.db.select = jest
        .fn()
        .mockImplementationOnce(() => ({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue([team]),
        }))
        .mockImplementationOnce(() => ({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue([{ canInviteMembers: true }]),
        }))
        .mockImplementationOnce(() => ({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue([]),
        }));

      mockDb.db.insert = jest.fn().mockReturnValue({
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([assignment]),
      });

      mockDb.db.update = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(undefined),
      });

      const result = await service.addMember('team-1', {
        userId: 'user-999',
      } as any);

      expect(result).toEqual(assignment);
    });

    it('should allow add when creator even without invite permission', async () => {
      const team = {
        id: 'team-1',
        createdBy: mockUserId,
        currentMemberCount: 1,
        maxMembers: 5,
      };
      const assignment = { id: 'assign-1', teamId: 'team-1' };

      mockDb.db.select = jest
        .fn()
        .mockImplementationOnce(() => ({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue([team]),
        }))
        .mockImplementationOnce(() => ({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue([{ canInviteMembers: false }]),
        }))
        .mockImplementationOnce(() => ({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue([]),
        }));

      mockDb.db.insert = jest.fn().mockReturnValue({
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([assignment]),
      });

      mockDb.db.update = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(undefined),
      });

      const result = await service.addMember('team-1', {
        userId: 'user-999',
      } as any);

      expect(result).toEqual(assignment);
      expect(mockNotification.push).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Member added to team' }),
      );
    });

    it('should throw when no invite permission', async () => {
      const team = {
        id: 'team-1',
        createdBy: 'other-user',
        currentMemberCount: 1,
        maxMembers: 5,
      };

      mockDb.db.select = jest
        .fn()
        .mockImplementationOnce(() => ({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue([team]),
        }))
        .mockImplementationOnce(() => ({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue([{ canInviteMembers: false }]),
        }));

      await expect(
        service.addMember('team-1', { userId: 'user-999' } as any),
      ).rejects.toThrow(
        'You do not have permission to add members to this team',
      );
    });

    it('should throw if team at max capacity', async () => {
      const team = {
        id: 'team-1',
        createdBy: 'other-user',
        currentMemberCount: 5,
        maxMembers: 5,
      };

      mockDb.db.select = jest
        .fn()
        .mockImplementationOnce(() => ({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue([team]),
        }))
        .mockImplementationOnce(() => ({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue([{ canInviteMembers: true }]),
        }));

      await expect(
        service.addMember('team-1', { userId: 'user-999' } as any),
      ).rejects.toThrow('Team has reached maximum capacity');
    });

    it('should throw if user already assigned', async () => {
      const team = {
        id: 'team-1',
        createdBy: 'other-user',
        currentMemberCount: 1,
        maxMembers: 5,
      };

      mockDb.db.select = jest
        .fn()
        .mockImplementationOnce(() => ({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue([team]),
        }))
        .mockImplementationOnce(() => ({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue([{ canInviteMembers: true }]),
        }))
        .mockImplementationOnce(() => ({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue([{ id: 'assign-1' }]),
        }));

      await expect(
        service.addMember('team-1', { userId: 'user-999' } as any),
      ).rejects.toThrow('User is already assigned to this team');
    });
  });
});
