// ----------------------------------------------------------------------------
// 2. CONTEXT MIDDLEWARE TESTS - context.middleware.spec.ts
// ----------------------------------------------------------------------------
import { ContextMiddleware } from '../context.middleware';
import { UserIdSource } from '../dto/context-config.dto';
import { ContextService } from '../context.service';
import { ContextConfigDto } from '../dto/context-config.dto';
import { Request, Response, NextFunction } from 'express';

describe('ContextMiddleware', () => {
  let middleware: ContextMiddleware;
  let contextService: ContextService;
  let config: ContextConfigDto;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    config = new ContextConfigDto();
    contextService = {
      setMeta: jest.fn(),
    } as any;

    middleware = new ContextMiddleware(contextService, config);

    mockRequest = {
      headers: {},
      path: '/api/test',
      method: 'GET',
      socket: { remoteAddress: '192.168.1.1' },
    } as any;

    mockResponse = {} as Response;
    mockNext = jest.fn();
  });

  describe('Context Initialization', () => {
    it('should initialize context on request', () => {
      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(contextService.setMeta).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should generate correlation ID', () => {
      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      const setMetaCall = (contextService.setMeta as jest.Mock).mock
        .calls[0][0];
      expect(setMetaCall.correlationId).toBeDefined();
      expect(typeof setMetaCall.correlationId).toBe('string');
    });

    it('should set timestamp', () => {
      const before = new Date();
      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );
      const after = new Date();

      const setMetaCall = (contextService.setMeta as jest.Mock).mock
        .calls[0][0];
      expect(setMetaCall.timestamp).toBeInstanceOf(Date);
      expect(setMetaCall.timestamp.getTime()).toBeGreaterThanOrEqual(
        before.getTime(),
      );
      expect(setMetaCall.timestamp.getTime()).toBeLessThanOrEqual(
        after.getTime(),
      );
    });
  });

  describe('User Extraction (Header Mode)', () => {
    beforeEach(() => {
      config.userIdSource = UserIdSource.HEADER;
    });

    it('should extract userId from header', () => {
      mockRequest.headers = { 'x-user-id': 'user-123' };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      const setMetaCall = (contextService.setMeta as jest.Mock).mock
        .calls[0][0];
      expect(setMetaCall.userId).toBe('user-123');
    });

    it('should extract orgId from header', () => {
      mockRequest.headers = { 'x-org-id': 'org-456' };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      const setMetaCall = (contextService.setMeta as jest.Mock).mock
        .calls[0][0];
      expect(setMetaCall.orgId).toBe('org-456');
    });

    it('should use configured header names', () => {
      config.headerNames.userId = 'custom-user-header';
      mockRequest.headers = { 'custom-user-header': 'user-999' };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      const setMetaCall = (contextService.setMeta as jest.Mock).mock
        .calls[0][0];
      expect(setMetaCall.userId).toBe('user-999');
    });
  });

  describe('User Extraction (JWT Mode)', () => {
    beforeEach(() => {
      config.userIdSource = UserIdSource.JWT;
    });

    it('should extract userId from req.user', () => {
      (mockRequest as any).user = { id: 'jwt-user-123' };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      const setMetaCall = (contextService.setMeta as jest.Mock).mock
        .calls[0][0];
      expect(setMetaCall.userId).toBe('jwt-user-123');
    });

    it('should extract orgId from req.user', () => {
      (mockRequest as any).user = { orgId: 'jwt-org-456' };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      const setMetaCall = (contextService.setMeta as jest.Mock).mock
        .calls[0][0];
      expect(setMetaCall.orgId).toBe('jwt-org-456');
    });

    it('should extract username and email', () => {
      (mockRequest as any).user = {
        id: 'user-123',
        username: 'johndoe',
        email: 'john@example.com',
      };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      const setMetaCall = (contextService.setMeta as jest.Mock).mock
        .calls[0][0];
      expect(setMetaCall.username).toBe('johndoe');
      expect(setMetaCall.email).toBe('john@example.com');
    });
  });

  describe('Correlation ID', () => {
    it('should use client-provided correlation ID if exists', () => {
      mockRequest.headers = { 'x-correlation-id': 'client-corr-123' };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      const setMetaCall = (contextService.setMeta as jest.Mock).mock
        .calls[0][0];
      expect(setMetaCall.correlationId).toBe('client-corr-123');
    });

    it('should generate new ID if not provided', () => {
      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      const setMetaCall = (contextService.setMeta as jest.Mock).mock
        .calls[0][0];
      expect(setMetaCall.correlationId).toBeDefined();
      expect(setMetaCall.correlationId).not.toBe('');
    });

    it('should use configured header name', () => {
      config.headerNames.correlationId = 'x-request-id';
      mockRequest.headers = { 'x-request-id': 'custom-id-789' };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      const setMetaCall = (contextService.setMeta as jest.Mock).mock
        .calls[0][0];
      expect(setMetaCall.correlationId).toBe('custom-id-789');
    });
  });

  describe('Request Details', () => {
    it('should include path and method when enabled', () => {
      config.includeRequestDetails = true;

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      const setMetaCall = (contextService.setMeta as jest.Mock).mock
        .calls[0][0];
      expect(setMetaCall.path).toBe('/api/test');
      expect(setMetaCall.method).toBe('GET');
    });

    it('should exclude when disabled', () => {
      config.includeRequestDetails = false;

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      const setMetaCall = (contextService.setMeta as jest.Mock).mock
        .calls[0][0];
      expect(setMetaCall.path).toBeUndefined();
      expect(setMetaCall.method).toBeUndefined();
    });

    it('should extract IP address correctly', () => {
      config.includeIp = true;
      mockRequest.socket = { remoteAddress: '192.168.1.100' } as any;

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      const setMetaCall = (contextService.setMeta as jest.Mock).mock
        .calls[0][0];
      expect(setMetaCall.ip).toBe('192.168.1.100');
    });

    it('should extract user agent when enabled', () => {
      config.includeUserAgent = true;
      mockRequest.headers = { 'user-agent': 'Mozilla/5.0' };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      const setMetaCall = (contextService.setMeta as jest.Mock).mock
        .calls[0][0];
      expect(setMetaCall.userAgent).toBe('Mozilla/5.0');
    });
  });

  describe('Custom Headers', () => {
    it('should capture custom headers when configured', () => {
      config.customHeaders = ['x-tenant-id', 'x-api-version'];
      mockRequest.headers = {
        'x-tenant-id': 'tenant-123',
        'x-api-version': 'v2',
      };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      const setMetaCall = (contextService.setMeta as jest.Mock).mock
        .calls[0][0];
      expect(setMetaCall['x-tenant-id']).toBe('tenant-123');
      expect(setMetaCall['x-api-version']).toBe('v2');
    });

    it('should skip if not configured', () => {
      config.customHeaders = undefined;
      mockRequest.headers = { 'x-custom': 'value' };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      const setMetaCall = (contextService.setMeta as jest.Mock).mock
        .calls[0][0];
      expect(setMetaCall['x-custom']).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should not block request if initialization fails', () => {
      (contextService.setMeta as jest.Mock).mockImplementation(() => {
        throw new Error('Test error');
      });

      expect(() =>
        middleware.use(
          mockRequest as Request,
          mockResponse as Response,
          mockNext,
        ),
      ).not.toThrow();

      expect(mockNext).toHaveBeenCalled();
    });

    it('should call next() even on error', () => {
      (contextService.setMeta as jest.Mock).mockImplementation(() => {
        throw new Error('Test error');
      });

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalledTimes(1);
    });
  });
});
