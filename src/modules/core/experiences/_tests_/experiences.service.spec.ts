/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// ============================================================================
// EXPERIENCES SERVICE TESTS
// src/modules/core/experiences/_tests_/experiences.service.spec.ts
// ============================================================================

import { Test, TestingModule } from '@nestjs/testing';
import { ExperiencesService } from '../experiences.service';
import { DatabaseService } from '@database/database.service';
import { ContextService } from '@modules/shared/context/context.service';
import { NotificationService } from '@modules/shared/notification/notification.service';
import { AppError } from '@shared/error/classes/app-error.class';

describe('ExperiencesService', () => {
  let service: ExperiencesService;
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
        ExperiencesService,
        { provide: DatabaseService, useValue: mockDb },
        { provide: ContextService, useValue: mockContext },
        { provide: NotificationService, useValue: mockNotification },
      ],
    }).compile();

    service = module.get<ExperiencesService>(ExperiencesService);
  });

  describe('multi-tenancy & context', () => {
    it('should throw when universityId is missing in findAll', async () => {
      mockContext.getContext = jest
        .fn()
        .mockReturnValue({ userId: mockUserId });

      await expect(service.findAll({} as any)).rejects.toThrow(AppError);
    });

    it('should throw when universityId is missing in findById', async () => {
      mockContext.getContext = jest
        .fn()
        .mockReturnValue({ userId: mockUserId });

      await expect(service.findById('exp-1')).rejects.toThrow(AppError);
    });
  });

  describe('create', () => {
    it('should create experience successfully', async () => {
      const dto = {
        title: 'Test Experience',
        overview: 'Test overview text that is long enough for validation.',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-03-01'),
      };

      const mockExperience = {
        id: 'exp-1',
        title: dto.title,
        createdBy: mockUserId,
        universityId: mockUniversityId,
        status: 'DRAFT',
        createdAt: new Date(),
      };

      mockDb.db.insert = jest.fn().mockReturnValue({
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([mockExperience]),
      });

      const result = await service.create(dto as any);

      expect(result).toEqual(mockExperience);
      expect(mockNotification.push).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Experience created successfully' }),
      );
    });

    it('should calculate durationWeeks when not provided', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-02-12'); // 6 weeks
      const dto = {
        title: 'Experience',
        overview: 'Valid overview long enough to pass validation.',
        startDate,
        endDate,
      };

      const valuesMock = jest.fn().mockReturnThis();
      mockDb.db.insert = jest.fn().mockReturnValue({
        values: valuesMock,
        returning: jest.fn().mockResolvedValue([{ id: 'exp-1' }]),
      });

      await service.create(dto as any);

      expect(valuesMock).toHaveBeenCalledWith(
        expect.objectContaining({
          durationWeeks: 6,
          status: 'DRAFT',
          createdBy: mockUserId,
          universityId: mockUniversityId,
        }),
      );
    });

    it('should throw if university context missing', async () => {
      mockContext.getContext = jest
        .fn()
        .mockReturnValue({ userId: mockUserId });

      await expect(
        service.create({
          title: 'Test Experience',
          overview: 'Test overview text that is long enough for validation.',
          startDate: new Date(),
          endDate: new Date(),
        } as any),
      ).rejects.toThrow('University context required');
    });

    it('should throw if user not authenticated', async () => {
      mockContext.getUserId = jest.fn().mockReturnValue(null);

      await expect(
        service.create({
          title: 'Test Experience',
          overview: 'Test overview text that is long enough for validation.',
          startDate: new Date(),
          endDate: new Date(),
        } as any),
      ).rejects.toThrow('User must be authenticated');
    });
  });

  describe('findAll', () => {
    it('should return paginated experiences', async () => {
      const items = [{ id: 'exp-1' }, { id: 'exp-2' }];

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
          where: jest.fn().mockResolvedValue([{ count: 2 }]),
        }));

      const result = await service.findAll({ page: 1, limit: 2 } as any);

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.totalPages).toBe(1);
    });

    it('should apply status and search filters', async () => {
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
        status: 'PUBLISHED',
        sortBy: 'title',
        sortOrder: 'asc',
      } as any);

      expect(result.total).toBe(0);
      expect(whereMock).toHaveBeenCalled();
      expect(orderByMock).toHaveBeenCalled();
    });

    it('should throw when universityId missing', async () => {
      mockContext.getContext = jest
        .fn()
        .mockReturnValue({ userId: mockUserId });

      await expect(service.findAll({} as any)).rejects.toThrow(
        'University context required',
      );
    });
  });

  describe('findById', () => {
    it('should return experience by ID', async () => {
      const mockExperience = { id: 'exp-1', createdBy: mockUserId };

      mockDb.db.select = jest.fn().mockImplementation(() => ({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockExperience]),
      }));

      const result = await service.findById('exp-1');

      expect(result).toEqual(mockExperience);
    });

    it('should throw if not found', async () => {
      mockDb.db.select = jest.fn().mockImplementation(() => ({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      }));

      await expect(service.findById('exp-404')).rejects.toThrow(
        'Experience not found',
      );
    });
  });

  describe('update', () => {
    it('should update when owner', async () => {
      const existing = { id: 'exp-1', createdBy: mockUserId };
      const updated = { id: 'exp-1', title: 'Updated' };

      mockDb.db.select = jest.fn().mockImplementation(() => ({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([existing]),
      }));

      mockDb.db.update = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([updated]),
      });

      const result = await service.update('exp-1', { title: 'Updated' } as any);

      expect(result).toEqual(updated);
    });

    it('should update status when provided', async () => {
      const existing = { id: 'exp-1', createdBy: mockUserId };
      const updated = { id: 'exp-1', status: 'ARCHIVED' };
      const setMock = jest.fn().mockReturnThis();

      mockDb.db.select = jest.fn().mockImplementation(() => ({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([existing]),
      }));

      mockDb.db.update = jest.fn().mockReturnValue({
        set: setMock,
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([updated]),
      });

      const result = await service.update('exp-1', {
        status: 'ARCHIVED',
      } as any);

      expect(result).toEqual(updated);
      expect(setMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'ARCHIVED',
          updatedAt: expect.any(Date),
        }),
      );
      expect(mockNotification.push).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Experience updated successfully' }),
      );
    });

    it('should throw if user not authenticated', async () => {
      mockContext.getUserId = jest.fn().mockReturnValue(null);

      await expect(
        service.update('exp-1', { title: 'Updated' } as any),
      ).rejects.toThrow('User must be authenticated');
    });

    it('should throw if not owner', async () => {
      const existing = { id: 'exp-1', createdBy: 'other-user' };

      mockDb.db.select = jest.fn().mockImplementation(() => ({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([existing]),
      }));

      await expect(
        service.update('exp-1', { title: 'Updated' } as any),
      ).rejects.toThrow('You can only update your own experiences');
    });
  });

  describe('publish', () => {
    it('should publish when valid', async () => {
      const existing = {
        id: 'exp-1',
        createdBy: mockUserId,
        overview: 'ok',
        expectedOutcomes: ['one'],
        mainContact: { name: 'Test', role: 'Lead', email: 'a@b.com' },
      };
      const published = { id: 'exp-1', status: 'PUBLISHED' };

      mockDb.db.select = jest.fn().mockImplementation(() => ({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([existing]),
      }));

      mockDb.db.update = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([published]),
      });

      const result = await service.publish('exp-1');

      expect(result).toEqual(published);
    });

    it('should throw if user not authenticated', async () => {
      mockContext.getUserId = jest.fn().mockReturnValue(null);

      await expect(service.publish('exp-1')).rejects.toThrow(
        'User must be authenticated',
      );
    });

    it('should throw if not owner', async () => {
      const existing = {
        id: 'exp-1',
        createdBy: 'other-user',
        overview: 'ok',
        expectedOutcomes: ['one'],
        mainContact: { name: 'Test', role: 'Lead', email: 'a@b.com' },
      };

      mockDb.db.select = jest.fn().mockImplementation(() => ({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([existing]),
      }));

      await expect(service.publish('exp-1')).rejects.toThrow(
        'You can only publish your own experiences',
      );
    });

    it('should throw if missing required fields', async () => {
      const existing = { id: 'exp-1', createdBy: mockUserId };

      mockDb.db.select = jest.fn().mockImplementation(() => ({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([existing]),
      }));

      await expect(service.publish('exp-1')).rejects.toThrow(
        'Experience must have overview, outcomes, and contact before publishing',
      );
    });
  });

  describe('archive', () => {
    it('should archive when owner', async () => {
      const existing = { id: 'exp-1', createdBy: mockUserId };
      const archived = { id: 'exp-1', status: 'ARCHIVED' };

      mockDb.db.select = jest.fn().mockImplementation(() => ({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([existing]),
      }));

      mockDb.db.update = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([archived]),
      });

      const result = await service.archive('exp-1');

      expect(result).toEqual(archived);
    });

    it('should throw if user not authenticated', async () => {
      mockContext.getUserId = jest.fn().mockReturnValue(null);

      await expect(service.archive('exp-1')).rejects.toThrow(
        'User must be authenticated',
      );
    });

    it('should throw if not owner', async () => {
      const existing = { id: 'exp-1', createdBy: 'other-user' };

      mockDb.db.select = jest.fn().mockImplementation(() => ({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([existing]),
      }));

      await expect(service.archive('exp-1')).rejects.toThrow(
        'You can only archive your own experiences',
      );
    });
  });

  describe('delete', () => {
    it('should delete draft experiences', async () => {
      const existing = { id: 'exp-1', createdBy: mockUserId, status: 'DRAFT' };

      mockDb.db.select = jest.fn().mockImplementation(() => ({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([existing]),
      }));

      mockDb.db.delete = jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue(undefined),
      });

      const result = await service.delete('exp-1');

      expect(result).toEqual({ success: true, message: 'Experience deleted' });
    });

    it('should throw if user not authenticated', async () => {
      mockContext.getUserId = jest.fn().mockReturnValue(null);

      await expect(service.delete('exp-1')).rejects.toThrow(
        'User must be authenticated',
      );
    });

    it('should throw if not owner', async () => {
      const existing = {
        id: 'exp-1',
        createdBy: 'other-user',
        status: 'DRAFT',
      };

      mockDb.db.select = jest.fn().mockImplementation(() => ({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([existing]),
      }));

      await expect(service.delete('exp-1')).rejects.toThrow(
        'You can only delete your own experiences',
      );
    });

    it('should throw if status is not DRAFT', async () => {
      const existing = {
        id: 'exp-1',
        createdBy: mockUserId,
        status: 'PUBLISHED',
      };

      mockDb.db.select = jest.fn().mockImplementation(() => ({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([existing]),
      }));

      await expect(service.delete('exp-1')).rejects.toThrow(
        'Only draft experiences can be deleted',
      );
    });
  });
});
