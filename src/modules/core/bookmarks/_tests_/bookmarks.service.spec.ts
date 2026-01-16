/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// ============================================================================
// PART 9: UNIT TESTS
// src/modules/bookmarks/bookmarks.service.spec.ts
// ============================================================================

import { Test, TestingModule } from '@nestjs/testing';
import { BookmarksService } from '../bookmarks.service';
import { DatabaseService } from '@database/database.service';
import { ContextService } from '@modules/shared/context/context.service';
import { NotificationService } from '@modules/shared/notification/notification.service';
import { AppError } from '@shared/error/classes/app-error.class';

describe('BookmarksService', () => {
  let service: BookmarksService;
  let mockDb: jest.Mocked<DatabaseService>;
  let mockContext: jest.Mocked<ContextService>;
  let mockNotification: jest.Mocked<NotificationService>;

  const mockStudentId = 'student-123';
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
      getUserId: jest.fn().mockReturnValue(mockStudentId),
    } as any;

    mockNotification = {
      push: jest.fn().mockResolvedValue(undefined),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookmarksService,
        { provide: DatabaseService, useValue: mockDb },
        { provide: ContextService, useValue: mockContext },
        { provide: NotificationService, useValue: mockNotification },
      ],
    }).compile();

    service = module.get<BookmarksService>(BookmarksService);
  });

  describe('create', () => {
    it('should create a bookmark successfully', async () => {
      const dto = { projectId: mockProjectId };
      const mockProject = { id: mockProjectId, title: 'Test Project' };
      const mockBookmark = {
        id: 'bookmark-789',
        studentId: mockStudentId,
        projectId: mockProjectId,
        sharedBy: null,
        createdAt: new Date(),
      };

      // Create separate select mock implementations for each query
      let selectCallCount = 0;
      mockDb.db.select = jest.fn().mockImplementation(() => {
        selectCallCount++;

        const chain = {
          from: jest.fn().mockReturnThis(),
          where: jest.fn(),
          limit: jest.fn(),
        };

        // First call: project lookup (has limit)
        if (selectCallCount === 1) {
          chain.where.mockReturnThis();
          chain.limit.mockResolvedValue([mockProject]);
        }
        // Second call: existing bookmark check (has limit)
        else if (selectCallCount === 2) {
          chain.where.mockReturnThis();
          chain.limit.mockResolvedValue([]);
        }
        // Third call: count query (NO limit, ends at where)
        else if (selectCallCount === 3) {
          chain.where.mockResolvedValue([{ count: 5 }]);
        }

        return chain;
      });

      // Mock insert
      mockDb.db.insert = jest.fn().mockReturnValue({
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([mockBookmark]),
      });

      const result = await service.create(dto);

      expect(result).toEqual(mockBookmark);
      expect(mockNotification.push).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Saved to bookmarks',
        }),
      );
    });

    it('should throw error if user not authenticated', async () => {
      mockContext.getUserId = jest.fn().mockReturnValue(null);

      await expect(
        service.create({ projectId: mockProjectId }),
      ).rejects.toThrow(AppError);
    });

    it('should throw error if project not found', async () => {
      mockDb.db.select = jest.fn().mockImplementation(() => ({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      }));

      await expect(
        service.create({ projectId: mockProjectId }),
      ).rejects.toThrow('Project not found');
    });

    it('should throw error if bookmark already exists', async () => {
      const mockProject = { id: mockProjectId };
      const existingBookmark = { id: 'bookmark-123' };

      let selectCallCount = 0;
      mockDb.db.select = jest.fn().mockImplementation(() => {
        selectCallCount++;

        const chain = {
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          limit: jest.fn(),
        };

        if (selectCallCount === 1) {
          chain.limit.mockResolvedValue([mockProject]);
        } else if (selectCallCount === 2) {
          chain.limit.mockResolvedValue([existingBookmark]);
        }

        return chain;
      });

      await expect(
        service.create({ projectId: mockProjectId }),
      ).rejects.toThrow('Project already bookmarked');
    });

    it('should throw error if bookmark limit reached', async () => {
      const mockProject = { id: mockProjectId };

      let selectCallCount = 0;
      mockDb.db.select = jest.fn().mockImplementation(() => {
        selectCallCount++;

        const chain = {
          from: jest.fn().mockReturnThis(),
          where: jest.fn(),
          limit: jest.fn(),
        };

        // First call: project lookup (has limit)
        if (selectCallCount === 1) {
          chain.where.mockReturnThis();
          chain.limit.mockResolvedValue([mockProject]);
        }
        // Second call: existing bookmark check (has limit)
        else if (selectCallCount === 2) {
          chain.where.mockReturnThis();
          chain.limit.mockResolvedValue([]);
        }
        // Third call: count query (NO limit, ends at where)
        else if (selectCallCount === 3) {
          chain.where.mockResolvedValue([{ count: 100 }]);
        }

        return chain;
      });

      await expect(
        service.create({ projectId: mockProjectId }),
      ).rejects.toThrow('Maximum bookmark limit');
    });
  });

  describe('remove', () => {
    it('should delete bookmark successfully', async () => {
      const bookmarkId = 'bookmark-123';
      const mockBookmark = {
        id: bookmarkId,
        studentId: mockStudentId,
        projectId: mockProjectId,
      };

      mockDb.db.select = jest.fn().mockImplementation(() => ({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockBookmark]),
      }));

      mockDb.db.delete = jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue(undefined),
      });

      const result = await service.remove(bookmarkId);

      expect(result.success).toBe(true);
      expect(mockNotification.push).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Removed from bookmarks',
        }),
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

    it('should throw error if not owner', async () => {
      const mockBookmark = {
        id: 'bookmark-123',
        studentId: 'other-student',
        projectId: mockProjectId,
      };

      mockDb.db.select = jest.fn().mockImplementation(() => ({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockBookmark]),
      }));

      await expect(service.remove('bookmark-123')).rejects.toThrow(
        'You can only delete your own bookmarks',
      );
    });
  });

  describe('bulkDelete', () => {
    it('should delete multiple bookmarks', async () => {
      const dto = {
        bookmarkIds: ['bookmark-1', 'bookmark-2', 'bookmark-3'],
      };

      const mockBookmarks = dto.bookmarkIds.map((id) => ({
        id,
        studentId: mockStudentId,
        projectId: mockProjectId,
      }));

      // Mock select WITHOUT limit - bulkDelete doesn't use limit
      mockDb.db.select = jest.fn().mockImplementation(() => ({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(mockBookmarks),
      }));

      mockDb.db.delete = jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue(undefined),
      });

      const result = await service.bulkDelete(dto);

      expect(result.deletedCount).toBe(3);
      expect(result.success).toBe(true);
    });

    it('should throw error if some bookmarks are invalid', async () => {
      const dto = {
        bookmarkIds: ['bookmark-1', 'bookmark-2', 'invalid-3'],
      };

      // Only return 2 bookmarks (not matching the requested 3)
      const mockBookmarks = [
        { id: 'bookmark-1', studentId: mockStudentId },
        { id: 'bookmark-2', studentId: mockStudentId },
      ];

      mockDb.db.select = jest.fn().mockImplementation(() => ({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(mockBookmarks),
      }));

      await expect(service.bulkDelete(dto)).rejects.toThrow(
        'Some bookmark IDs are invalid',
      );
    });
  });

  describe('getCount', () => {
    it('should return bookmark count', async () => {
      mockDb.db.select = jest.fn().mockImplementation(() => ({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ count: 42 }]),
      }));

      const count = await service.getCount();

      expect(count).toBe(42);
    });

    it('should return 0 if not authenticated', async () => {
      mockContext.getUserId = jest.fn().mockReturnValue(null);

      const count = await service.getCount();

      expect(count).toBe(0);
    });
  });
});
