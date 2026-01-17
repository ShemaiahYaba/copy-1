/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsService } from '../projects.service';
import { DatabaseService } from '@database/database.service';
import { ContextService } from '@modules/shared/context/context.service';
import { NotificationService } from '@modules/shared/notification/notification.service';
import { AppError } from '@shared/error/classes/app-error.class';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let mockDb: any;
  let mockContext: any;
  let mockNotification: any;

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
    };

    mockContext = {
      getUserId: jest.fn().mockReturnValue(mockUserId),
      getContext: jest.fn().mockReturnValue({
        userId: mockUserId,
        universityId: mockUniversityId,
      }),
    };

    mockNotification = {
      push: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: DatabaseService, useValue: mockDb },
        { provide: ContextService, useValue: mockContext },
        { provide: NotificationService, useValue: mockNotification },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a project', async () => {
      const mockClient = { id: 'client-123', userId: mockUserId };
      const mockProject = {
        id: 'project-123',
        title: 'Test Project',
        status: 'draft',
        approvalStatus: 'pending',
        isPublished: false,
        clientId: 'client-123',
        createdBy: mockUserId,
        category: 'web_development',
      };

      mockDb.db.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockClient]),
      });

      mockDb.db.insert.mockReturnValue({
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([mockProject]),
      });

      const result = await service.create({
        title: 'Test Project',
        description: 'Test description',
        requiredSkills: ['JavaScript'],
        duration: 12,
        category: 'web_development',
      } as any);

      expect(result).toEqual(mockProject);
      expect(mockNotification.push).toHaveBeenCalled();
    });

    it('should throw error when user is not authenticated', async () => {
      mockContext.getUserId.mockReturnValue(null);

      await expect(
        service.create({
          title: 'Test Project',
          description: 'Test description',
          requiredSkills: ['JavaScript'],
          duration: 12,
          category: 'web_development',
        } as any),
      ).rejects.toThrow('User must be authenticated');
    });

    it('should throw error when universityId is missing', async () => {
      mockContext.getContext.mockReturnValue({ userId: mockUserId });

      await expect(
        service.create({
          title: 'Test Project',
          description: 'Test description',
          requiredSkills: ['JavaScript'],
          duration: 12,
          category: 'web_development',
        } as any),
      ).rejects.toThrow(AppError);
    });

    it('should throw error when user is not a client', async () => {
      mockDb.db.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      });

      await expect(
        service.create({
          title: 'Test Project',
          description: 'Test description',
          requiredSkills: ['JavaScript'],
          duration: 12,
          category: 'web_development',
        } as any),
      ).rejects.toThrow('Only clients can create projects');
    });
  });

  describe('findById', () => {
    it('should return project by ID', async () => {
      const mockProject = { id: 'project-123', universityId: mockUniversityId };

      mockDb.db.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockProject]),
      });

      const result = await service.findById('project-123');

      expect(result).toEqual(mockProject);
    });

    it('should throw when universityId missing', async () => {
      mockContext.getContext.mockReturnValue({ userId: mockUserId });

      await expect(service.findById('project-123')).rejects.toThrow(AppError);
    });

    it('should throw if not found', async () => {
      mockDb.db.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      });

      await expect(service.findById('project-404')).rejects.toThrow(
        'Project not found',
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated projects', async () => {
      const items = [{ id: 'project-1' }];

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
        search: 'capstone',
        status: 'published',
        approvalStatus: 'approved',
        category: 'web_development',
        requiredSkills: ['React'],
        tags: ['frontend'],
        industry: 'tech',
        isRemote: true,
        isPublished: true,
        isAvailable: true,
        sortBy: 'title',
        sortOrder: 'asc',
      } as any);

      expect(result.total).toBe(0);
      expect(whereMock).toHaveBeenCalled();
      expect(orderByMock).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should increment view count', async () => {
      const mockProject = { id: 'project-1', viewCount: 1 };

      mockDb.db.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockProject]),
      });

      mockDb.db.update.mockReturnValue({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(undefined),
      });

      const result = await service.findOne('project-1');

      expect(result.viewCount).toBe(2);
      expect(mockDb.db.update).toHaveBeenCalled();
    });

    it('should throw if not found', async () => {
      mockDb.db.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      });

      await expect(service.findOne('project-404')).rejects.toThrow(
        'Project not found',
      );
    });
  });

  describe('update', () => {
    it('should throw if user not authenticated', async () => {
      mockContext.getUserId.mockReturnValue(null);

      await expect(
        service.update('project-1', { title: 'Updated' } as any),
      ).rejects.toThrow('User must be authenticated');
    });

    it('should throw if project not found', async () => {
      mockDb.db.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      });

      await expect(
        service.update('project-404', { title: 'Updated' } as any),
      ).rejects.toThrow('Project not found');
    });

    it('should update when owner', async () => {
      const existing = { id: 'project-1', createdBy: mockUserId };
      const updated = { id: 'project-1', title: 'Updated' };

      mockDb.db.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([existing]),
      });

      mockDb.db.update.mockReturnValue({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([updated]),
      });

      const result = await service.update('project-1', { title: 'Updated' } as any);

      expect(result).toEqual(updated);
    });

    it('should map enum updates when provided', async () => {
      const existing = { id: 'project-1', createdBy: mockUserId };
      const updated = {
        id: 'project-1',
        status: 'published',
        category: 'web_development',
        difficulty: 'intermediate',
        visibility: 'public',
      };
      const setMock = jest.fn().mockReturnThis();

      mockDb.db.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([existing]),
      });

      mockDb.db.update.mockReturnValue({
        set: setMock,
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([updated]),
      });

      const result = await service.update('project-1', {
        status: 'published',
        category: 'web_development',
        difficulty: 'intermediate',
        visibility: 'public',
      } as any);

      expect(result).toEqual(updated);
      expect(setMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'published',
          category: 'web_development',
          difficulty: 'intermediate',
          visibility: 'public',
          updatedAt: expect.any(Date),
        }),
      );
      expect(mockNotification.push).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Project updated successfully' }),
      );
    });

    it('should throw if not owner', async () => {
      const existing = { id: 'project-1', createdBy: 'other-user' };

      mockDb.db.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([existing]),
      });

      await expect(
        service.update('project-1', { title: 'Updated' } as any),
      ).rejects.toThrow('You can only update your own projects');
    });
  });

  describe('remove', () => {
    it('should throw if user not authenticated', async () => {
      mockContext.getUserId.mockReturnValue(null);

      await expect(service.remove('project-1')).rejects.toThrow(
        'User must be authenticated',
      );
    });

    it('should throw if project not found', async () => {
      mockDb.db.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      });

      await expect(service.remove('project-404')).rejects.toThrow(
        'Project not found',
      );
    });

    it('should throw if not owner', async () => {
      const existing = { id: 'project-1', createdBy: 'other-user' };

      mockDb.db.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([existing]),
      });

      await expect(service.remove('project-1')).rejects.toThrow(
        'You can only delete your own projects',
      );
    });

    it('should delete project when allowed', async () => {
      const existing = { id: 'project-1', createdBy: mockUserId };

      mockDb.db.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([existing]),
      });

      mockDb.db.delete.mockReturnValue({
        where: jest.fn().mockResolvedValue(undefined),
      });

      const result = await service.remove('project-1');

      expect(result.success).toBe(true);
    });

    it('should throw if assigned to team', async () => {
      const existing = {
        id: 'project-1',
        createdBy: mockUserId,
        assignedTeamId: 'team-1',
      };

      mockDb.db.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([existing]),
      });

      await expect(service.remove('project-1')).rejects.toThrow(
        'Cannot delete a project that is assigned to a team',
      );
    });
  });

  describe('publish', () => {
    it('should throw if user not authenticated', async () => {
      mockContext.getUserId.mockReturnValue(null);

      await expect(service.publish('project-1')).rejects.toThrow(
        'User must be authenticated',
      );
    });

    it('should publish approved project', async () => {
      const existing = {
        id: 'project-1',
        createdBy: mockUserId,
        approvalStatus: 'approved',
      };
      const published = { id: 'project-1', status: 'published' };

      mockDb.db.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([existing]),
      });

      mockDb.db.update.mockReturnValue({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([published]),
      });

      const result = await service.publish('project-1');

      expect(result).toEqual(published);
    });

    it('should throw if project not found', async () => {
      mockDb.db.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      });

      await expect(service.publish('project-404')).rejects.toThrow(
        'Project not found',
      );
    });

    it('should throw if not owner', async () => {
      const existing = {
        id: 'project-1',
        createdBy: 'other-user',
        approvalStatus: 'approved',
      };

      mockDb.db.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([existing]),
      });

      await expect(service.publish('project-1')).rejects.toThrow(
        'You can only publish your own projects',
      );
    });

    it('should throw if not approved', async () => {
      const existing = {
        id: 'project-1',
        createdBy: mockUserId,
        approvalStatus: 'pending',
      };

      mockDb.db.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([existing]),
      });

      await expect(service.publish('project-1')).rejects.toThrow(
        'Project must be approved before publishing',
      );
    });
  });

  describe('approve', () => {
    it('should throw if user not authenticated', async () => {
      mockContext.getUserId.mockReturnValue(null);

      await expect(service.approve('project-1')).rejects.toThrow(
        'User must be authenticated',
      );
    });

    it('should approve project', async () => {
      const approved = { id: 'project-1', approvalStatus: 'approved' };

      mockDb.db.update.mockReturnValue({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([approved]),
      });

      const result = await service.approve('project-1');

      expect(result).toEqual(approved);
    });

    it('should throw if project not found', async () => {
      mockDb.db.update.mockReturnValue({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([]),
      });

      await expect(service.approve('project-404')).rejects.toThrow(
        'Project not found',
      );
    });
  });

  describe('assignTeam', () => {
    it('should throw if project not found', async () => {
      mockDb.db.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      });

      await expect(service.assignTeam('project-404', 'team-1')).rejects.toThrow(
        'Project not found',
      );
    });

    it('should assign team to project', async () => {
      const existing = { id: 'project-1', assignedTeamId: null };
      const assigned = { id: 'project-1', assignedTeamId: 'team-1' }; 

      mockDb.db.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([existing]),
      });

      mockDb.db.update.mockReturnValue({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([assigned]),
      });

      const result = await service.assignTeam('project-1', 'team-1');

      expect(result).toEqual(assigned);
    });

    it('should throw if already assigned', async () => {
      const existing = { id: 'project-1', assignedTeamId: 'team-1' };

      mockDb.db.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([existing]),
      });

      await expect(service.assignTeam('project-1', 'team-2')).rejects.toThrow(
        'Project is already assigned to a team',
      );
    });
  });

  describe('getMyProjects', () => {
    it('should return projects for current client', async () => {
      const mockClient = { id: 'client-123', userId: mockUserId };
      const items = [{ id: 'project-1' }];

      mockDb.db.select = jest
        .fn()
        .mockImplementationOnce(() => ({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue([mockClient]),
        }))
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

      const result = await service.getMyProjects({ page: 1, limit: 1 } as any);

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should throw if user not a client', async () => {
      mockDb.db.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      });

      await expect(service.getMyProjects({} as any)).rejects.toThrow(
        'Only clients can view their projects',
      );
    });
  });

  describe('studentProjectFeed', () => {
    it('should throw if user not authenticated', async () => {
      mockContext.getUserId.mockReturnValue(null);

      await expect(service.studentProjectFeed('student-1')).rejects.toThrow(
        'User must be authenticated',
      );
    });

    it('should return cards with page info', async () => {
      const project = {
        id: 'project-1',
        title: 'Test',
        description: 'Description',
        requiredSkills: ['React'],
        tags: ['tag1'],
        createdAt: new Date(),
        category: 'web_development',
      };

      mockDb.db.select = jest
        .fn()
        .mockImplementationOnce(() => ({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue([project]),
        }))
        .mockImplementationOnce(() => ({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          groupBy: jest.fn().mockResolvedValue([{ category: 'web_development' }]),
        }))
        .mockImplementationOnce(() => ({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue([{ skills: ['React'] }]),
        }));

      const result = await service.studentProjectFeed('student-1', {
        search: 'Test',
        sort: 'NEWEST_FIRST',
      } as any);

      expect(result.cards).toHaveLength(1);
      expect(result.filtersMeta.availableCategories).toEqual([
        'web_development',
      ]);
      expect(result.pageInfo.hasNextPage).toBe(false);
    });
  });

  describe('studentProjectFeedSearch', () => {
    it('should throw if user not authenticated', async () => {
      mockContext.getUserId.mockReturnValue(null);

      await expect(
        service.studentProjectFeedSearch('student-1', 'term'),
      ).rejects.toThrow('User must be authenticated');
    });

    it('should return card ids', async () => {
      mockDb.db.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]),
      });

      const result = await service.studentProjectFeedSearch('student-1', 'term');

      expect(result.cardIds).toEqual(['p1', 'p2']);
    });
  });
});
