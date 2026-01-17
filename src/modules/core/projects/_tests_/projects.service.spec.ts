/* eslint-disable @typescript-eslint/no-unsafe-argument */
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
  });

  describe('update', () => {
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

      const result = await service.update('project-1', {
        title: 'Updated',
      } as any);

      expect(result).toEqual(updated);
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
});
