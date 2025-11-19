// ----------------------------------------------------------------------------
// 1. CONTEXT SERVICE TESTS - context.service.spec.ts
// ----------------------------------------------------------------------------
import { Test, TestingModule } from '@nestjs/testing';
import { ContextService } from '../context.service';
import {
  ContextConfigDto,
  ContextStorageAdapter,
} from '../dto/context-config.dto';
import { ContextMeta } from '../interfaces/context-meta.interface';
import { ClsStorageAdapter } from '../adapters/cls-storage.adapter';

describe('ContextService', () => {
  let service: ContextService;
  let storage: ClsStorageAdapter;
  let config: ContextConfigDto;

  beforeEach(async () => {
    config = new ContextConfigDto();
    config.adapter = ContextStorageAdapter.CLS;

    // Mock storage
    storage = {
      set: jest.fn(),
      get: jest.fn(),
      has: jest.fn(),
      clear: jest.fn(),
      update: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContextService,
        {
          provide: 'CONTEXT_STORAGE',
          useValue: storage,
        },
        {
          provide: 'CONTEXT_CONFIG',
          useValue: config,
        },
      ],
    }).compile();

    service = module.get<ContextService>(ContextService);
  });

  describe('Metadata Management', () => {
    it('should set complete metadata', () => {
      const meta: ContextMeta = {
        userId: '123',
        orgId: 'org-456',
        correlationId: 'corr-789',
        timestamp: new Date(),
      };

      service.setMeta(meta);

      expect(storage.set).toHaveBeenCalledWith(meta);
    });

    it('should get complete metadata', () => {
      const meta: ContextMeta = {
        userId: '123',
        correlationId: 'corr-456',
        timestamp: new Date(),
      };
      (storage.get as jest.Mock).mockReturnValue(meta);

      const result = service.getMeta();

      expect(result).toEqual(meta);
      expect(storage.get).toHaveBeenCalled();
    });

    it('should update specific fields', () => {
      const partial = { userId: '999', orgId: 'org-999' };

      service.updateMeta(partial);

      expect(storage.update).toHaveBeenCalledWith(partial);
    });

    it('should get specific field by key', () => {
      const meta: ContextMeta = {
        userId: '123',
        orgId: 'org-456',
        correlationId: 'corr-789',
        timestamp: new Date(),
      };
      (storage.get as jest.Mock).mockReturnValue(meta);

      const userId = service.get('userId');

      expect(userId).toBe('123');
    });

    it('should set specific field by key', () => {
      const meta: ContextMeta = {
        correlationId: 'corr-123',
        timestamp: new Date(),
      };
      (storage.get as jest.Mock).mockReturnValue(meta);

      service.set('userId', '456');

      expect(storage.update).toHaveBeenCalledWith({ userId: '456' });
    });

    it('should return undefined for missing context', () => {
      (storage.get as jest.Mock).mockReturnValue(undefined);

      const result = service.getMeta();

      expect(result).toBeUndefined();
    });

    it('should clear context', () => {
      service.clear();

      expect(storage.clear).toHaveBeenCalled();
    });
  });

  describe('Helper Methods', () => {
    it('getUserId() should return userId from context', () => {
      const meta: ContextMeta = {
        userId: 'user-123',
        correlationId: 'corr-456',
        timestamp: new Date(),
      };
      (storage.get as jest.Mock).mockReturnValue(meta);

      const userId = service.getUserId();

      expect(userId).toBe('user-123');
    });

    it('getOrgId() should return orgId from context', () => {
      const meta: ContextMeta = {
        orgId: 'org-789',
        correlationId: 'corr-456',
        timestamp: new Date(),
      };
      (storage.get as jest.Mock).mockReturnValue(meta);

      const orgId = service.getOrgId();

      expect(orgId).toBe('org-789');
    });

    it('getCorrelationId() should always return value', () => {
      const meta: ContextMeta = {
        correlationId: 'corr-123',
        timestamp: new Date(),
      };
      (storage.get as jest.Mock).mockReturnValue(meta);

      const correlationId = service.getCorrelationId();

      expect(correlationId).toBe('corr-123');
    });

    it('getCorrelationId() should return default when missing', () => {
      (storage.get as jest.Mock).mockReturnValue(undefined);

      const correlationId = service.getCorrelationId();

      expect(correlationId).toBe('no-correlation-id');
    });

    it('hasContext() should return true when context exists', () => {
      (storage.has as jest.Mock).mockReturnValue(true);

      const result = service.hasContext();

      expect(result).toBe(true);
    });

    it('hasContext() should return false when context missing', () => {
      (storage.has as jest.Mock).mockReturnValue(false);

      const result = service.hasContext();

      expect(result).toBe(false);
    });
  });

  describe('Logging Context', () => {
    it('getLoggingContext() should return formatted object', () => {
      const meta: ContextMeta = {
        userId: 'user-123',
        orgId: 'org-456',
        correlationId: 'corr-789',
        path: '/api/test',
        method: 'GET',
        timestamp: new Date('2025-11-18T12:00:00Z'),
        ip: '192.168.1.1',
      };
      (storage.get as jest.Mock).mockReturnValue(meta);

      const loggingContext = service.getLoggingContext();

      expect(loggingContext).toEqual({
        userId: 'user-123',
        orgId: 'org-456',
        correlationId: 'corr-789',
        path: '/api/test',
        method: 'GET',
        timestamp: meta.timestamp,
      });
    });

    it('should include relevant fields only', () => {
      const meta: ContextMeta = {
        userId: 'user-123',
        correlationId: 'corr-456',
        timestamp: new Date(),
        customField: 'custom-value',
      };
      (storage.get as jest.Mock).mockReturnValue(meta);

      const loggingContext = service.getLoggingContext();

      expect(loggingContext).not.toHaveProperty('customField');
      expect(loggingContext).toHaveProperty('userId');
      expect(loggingContext).toHaveProperty('correlationId');
    });

    it('should handle missing context gracefully', () => {
      (storage.get as jest.Mock).mockReturnValue(undefined);

      const loggingContext = service.getLoggingContext();

      expect(loggingContext).toEqual({});
    });
  });

  describe('Error Handling', () => {
    it('should not throw on missing context', () => {
      (storage.get as jest.Mock).mockReturnValue(undefined);

      expect(() => service.getMeta()).not.toThrow();
      expect(() => service.getUserId()).not.toThrow();
      expect(() => service.getOrgId()).not.toThrow();
    });

    it('should return undefined for missing fields', () => {
      const meta: ContextMeta = {
        correlationId: 'corr-123',
        timestamp: new Date(),
      };
      (storage.get as jest.Mock).mockReturnValue(meta);

      const userId = service.getUserId();
      const orgId = service.getOrgId();

      expect(userId).toBeUndefined();
      expect(orgId).toBeUndefined();
    });

    it('should handle storage errors gracefully', () => {
      (storage.get as jest.Mock).mockImplementation(() => {
        throw new Error('Storage error');
      });

      const result = service.getMeta();

      expect(result).toBeUndefined();
    });
  });
});
