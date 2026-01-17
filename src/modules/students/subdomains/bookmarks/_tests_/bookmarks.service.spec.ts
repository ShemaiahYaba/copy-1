/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// ============================================================================
// STUDENT BOOKMARKS SERVICE TESTS
// src/modules/students/subdomains/bookmarks/_tests_/bookmarks.service.spec.ts
// ============================================================================

import { Test, TestingModule } from '@nestjs/testing';
import { StudentBookmarksService } from '../bookmarks.service';
import { DatabaseService } from '@database/database.service';
import { ContextService } from '@modules/shared/context/context.service';
import { NotificationService } from '@modules/shared/notification/notification.service';
import { ProjectsService } from '@modules/core/projects/projects.service';
import { AppError } from '@shared/error/classes/app-error.class';
import { BookmarkFilter } from '../dto/filter-bookmarks.dto';

describe('StudentBookmarksService', () => {
  let service: StudentBookmarksService;
  let mockDb: jest.Mocked<DatabaseService>;
  let mockContext: jest.Mocked<ContextService>;
  let mockNotification: jest.Mocked<NotificationService>;
  let mockProjectsService: jest.Mocked<ProjectsService>;

  const mockStudentId = 'student-123';
  const mockUniversityId = 'univ-456';
  const mockProjectId = 'proj-456';

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
      getContext: jest.fn().mockReturnValue({
        studentId: mockStudentId,
        universityId: mockUniversityId,
      }),
    } as any;

    mockNotification = {
      push: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockProjectsService = {
      findById: jest.fn().mockResolvedValue({
        id: mockProjectId,
        title: 'Project X',
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentBookmarksService,
        { provide: DatabaseService, useValue: mockDb },
        { provide: ContextService, useValue: mockContext },
        { provide: NotificationService, useValue: mockNotification },
        { provide: ProjectsService, useValue: mockProjectsService },
      ],
    }).compile();

    service = module.get<StudentBookmarksService>(StudentBookmarksService);
  });

  describe('context', () => {
    it('should throw when universityId missing', async () => {
      mockContext.getContext = jest
        .fn()
        .mockReturnValue({ studentId: mockStudentId });

      await expect(service.findAll({} as any)).rejects.toThrow(AppError);
    });

    it('should return 0 when context missing for getCount', async () => {
      mockContext.getContext = jest.fn().mockReturnValue({});

      const result = await service.getCount();

      expect(result).toBe(0);
    });
  });

  describe('create', () => {
    it('should create a bookmark successfully', async () => {
      const mockBookmark = {
        id: 'bookmark-789',
        studentId: mockStudentId,
        universityId: mockUniversityId,
        projectId: mockProjectId,
        sharedBy: null,
        createdAt: new Date(),
      };

      let selectCallCount = 0;
      mockDb.db.select = jest.fn().mockImplementation(() => {
        selectCallCount++;

        const chain = {
          from: jest.fn().mockReturnThis(),
          where: jest.fn(),
          limit: jest.fn(),
        };

        if (selectCallCount === 1) {
          chain.where.mockReturnThis();
          chain.limit.mockResolvedValue([]);
        } else if (selectCallCount === 2) {
          chain.where.mockResolvedValue([{ count: 5 }]);
        }

        return chain;
      });

      mockDb.db.insert = jest.fn().mockReturnValue({
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([mockBookmark]),
      });

      const result = await service.create({ projectId: mockProjectId } as any);

      expect(mockProjectsService.findById).toHaveBeenCalledWith(mockProjectId);
      expect(result).toEqual(mockBookmark);
      expect(mockNotification.push).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Saved "Project X" to bookmarks' }),
      );
    });

    it('should throw error if user not authenticated', async () => {
      mockContext.getContext = jest
        .fn()
        .mockReturnValue({ universityId: mockUniversityId });

      await expect(
        service.create({ projectId: mockProjectId } as any),
      ).rejects.toThrow('User must be authenticated');
    });

    it('should throw error if project already bookmarked', async () => {
      mockDb.db.select = jest.fn().mockImplementation(() => ({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{ id: 'bookmark-1' }]),
      }));

      await expect(
        service.create({ projectId: mockProjectId } as any),
      ).rejects.toThrow('Project already bookmarked');
    });

    it('should throw error if bookmark limit reached', async () => {
      let selectCallCount = 0;
      mockDb.db.select = jest.fn().mockImplementation(() => {
        selectCallCount++;

        const chain = {
          from: jest.fn().mockReturnThis(),
          where: jest.fn(),
          limit: jest.fn(),
        };

        if (selectCallCount === 1) {
          chain.where.mockReturnThis();
          chain.limit.mockResolvedValue([]);
        } else if (selectCallCount === 2) {
          chain.where.mockResolvedValue([{ count: 100 }]);
        }

        return chain;
      });

      await expect(
        service.create({ projectId: mockProjectId } as any),
      ).rejects.toThrow('Maximum bookmark limit reached');
    });
  });

  describe('findAll', () => {
    it('should return paginated bookmarks', async () => {
      const rows = [
        {
          bookmark: {
            id: 'bookmark-1',
            createdAt: new Date(),
            sharedBy: null,
          },
          project: {
            id: mockProjectId,
            title: 'Project 1',
            description: 'Desc',
            requiredSkills: ['A'],
            category: 'design',
            status: 'published',
            createdAt: new Date(),
            organization: 'Org',
          },
        },
      ];

      mockDb.db.select = jest
        .fn()
        .mockImplementationOnce(() => ({
          from: jest.fn().mockReturnThis(),
          innerJoin: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          offset: jest.fn().mockResolvedValue(rows),
        }))
        .mockImplementationOnce(() => ({
          from: jest.fn().mockReturnThis(),
          innerJoin: jest.fn().mockReturnThis(),
          where: jest.fn().mockResolvedValue([{ count: 1 }]),
        }));

      const result = await service.findAll({ page: 1, limit: 1 } as any);

      expect(result.total).toBe(1);
      expect(result.cards).toHaveLength(1);
    });

    it('should apply shared filter', async () => {
      mockDb.db.select = jest
        .fn()
        .mockImplementationOnce(() => ({
          from: jest.fn().mockReturnThis(),
          innerJoin: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          offset: jest.fn().mockResolvedValue([]),
        }))
        .mockImplementationOnce(() => ({
          from: jest.fn().mockReturnThis(),
          innerJoin: jest.fn().mockReturnThis(),
          where: jest.fn().mockResolvedValue([{ count: 0 }]),
        }));

      const result = await service.findAll({
        filter: BookmarkFilter.SHARED,
      } as any);

      expect(result.total).toBe(0);
    });
  });

  describe('findOne', () => {
    it('should return bookmark by ID', async () => {
      const mockBookmark = {
        id: 'bookmark-1',
        studentId: mockStudentId,
        universityId: mockUniversityId,
      };

      mockDb.db.select = jest.fn().mockImplementation(() => ({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockBookmark]),
      }));

      const result = await service.findOne('bookmark-1');

      expect(result).toEqual(mockBookmark);
    });

    it('should throw if not found', async () => {
      mockDb.db.select = jest.fn().mockImplementation(() => ({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      }));

      await expect(service.findOne('missing')).rejects.toThrow(
        'Bookmark not found',
      );
    });
  });

  describe('remove', () => {
    it('should delete bookmark successfully', async () => {
      const mockBookmark = {
        id: 'bookmark-1',
        studentId: mockStudentId,
        universityId: mockUniversityId,
      };

      mockDb.db.select = jest.fn().mockImplementation(() => ({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockBookmark]),
      }));

      mockDb.db.delete = jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue(undefined),
      });

      const result = await service.remove('bookmark-1');

      expect(result.success).toBe(true);
      expect(mockNotification.push).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Bookmark removed' }),
      );
    });

    it('should throw error if bookmark not found', async () => {
      mockDb.db.select = jest.fn().mockImplementation(() => ({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      }));

      await expect(service.remove('invalid-id')).rejects.toThrow(
        'Bookmark not found',
      );
    });
  });

  describe('removeByProjectId', () => {
    it('should delete by projectId', async () => {
      mockDb.db.delete = jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([{ id: 'bookmark-1' }]),
      });

      const result = await service.removeByProjectId(mockProjectId);

      expect(result.success).toBe(true);
      expect(mockNotification.push).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Bookmark removed' }),
      );
    });

    it('should throw if not found', async () => {
      mockDb.db.delete = jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([]),
      });

      await expect(service.removeByProjectId(mockProjectId)).rejects.toThrow(
        'Bookmark not found',
      );
    });
  });

  describe('bulkDelete', () => {
    it('should delete multiple bookmarks', async () => {
      const dto = { bookmarkIds: ['bookmark-1', 'bookmark-2'] };
      const mockBookmarks = dto.bookmarkIds.map((id) => ({
        id,
        studentId: mockStudentId,
      }));

      mockDb.db.select = jest.fn().mockImplementation(() => ({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(mockBookmarks),
      }));

      mockDb.db.delete = jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue(undefined),
      });

      const result = await service.bulkDelete(dto as any);

      expect(result.deletedCount).toBe(2);
    });

    it('should throw error if none found', async () => {
      mockDb.db.select = jest.fn().mockImplementation(() => ({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([]),
      }));

      await expect(
        service.bulkDelete({ bookmarkIds: ['bookmark-1'] } as any),
      ).rejects.toThrow('No bookmarks found to delete');
    });
  });

  describe('search', () => {
    it('should return bookmark IDs', async () => {
      mockDb.db.select = jest.fn().mockImplementation(() => ({
        from: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ id: 'b1' }]),
      }));

      const result = await service.search('term');

      expect(result.bookmarkIds).toEqual(['b1']);
    });
  });

  describe('getCount', () => {
    it('should return count for student', async () => {
      mockDb.db.select = jest.fn().mockImplementation(() => ({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ count: 42 }]),
      }));

      const count = await service.getCount();

      expect(count).toBe(42);
    });
  });
});
