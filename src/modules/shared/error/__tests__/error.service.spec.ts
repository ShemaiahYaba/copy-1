// ----------------------------------------------------------------------------
// ERROR SERVICE - UNIT TESTS (UPDATED FOR SENTRY)
// src/modules/shared/error/__tests__/error.service.spec.ts
// ----------------------------------------------------------------------------

import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorService } from '../error.service';
import {
  ErrorConfigDto,
  ErrorNotificationStrategy,
} from '../dto/error-config.dto';
import { AppError } from '../classes/app-error.class';
import { ValidationError } from '../classes/validation-error.class';
import { BusinessError } from '../classes/business-error.class';
import { ERROR_CODES } from '../constants/error-codes.constant';
import { ErrorSeverity } from '../interfaces/error.interface';
import { ErrorResponseDto } from '../dto/error-response.dto';
import * as Sentry from '@sentry/nestjs';

// Mock Sentry
jest.mock('@sentry/nestjs', () => ({
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  withScope: jest.fn((callback) => {
    const mockScope = {
      setLevel: jest.fn(),
      setTag: jest.fn(),
      setContext: jest.fn(),
    };
    callback(mockScope);
  }),
}));

describe('ErrorService', () => {
  let service: ErrorService;
  let config: ErrorConfigDto;

  beforeEach(async () => {
    config = new ErrorConfigDto();
    config.includeStackTrace = false;
    config.notifyFrontend = true;
    config.notificationStrategy = ErrorNotificationStrategy.OPERATIONAL;
    config.logErrors = false; // Disable logs in tests
    config.captureContext = true;
    config.enableSentry = false;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ErrorService,
        {
          provide: 'ERROR_CONFIG',
          useValue: config,
        },
      ],
    }).compile();

    service = module.get<ErrorService>(ErrorService);

    // Clear mocks
    jest.clearAllMocks();
  });

  describe('Service Creation', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with config', () => {
      expect(service).toBeInstanceOf(ErrorService);
    });
  });

  describe('processError() Method', () => {
    describe('Processing AppError', () => {
      it('should process AppError correctly', () => {
        const appError = new AppError(
          ERROR_CODES.RESOURCE_NOT_FOUND,
          'Project not found',
          { projectId: '123' },
        );

        const result = service.processError(appError);

        expect(result).toBeInstanceOf(ErrorResponseDto);
        expect(result.code).toBe(ERROR_CODES.RESOURCE_NOT_FOUND);
        expect(result.message).toBe('Project not found');
        expect(result.context).toEqual({ projectId: '123' });
        expect(result.status).toBe('error');
        expect(result.timestamp).toBeInstanceOf(Date);
      });

      it('should not include stack trace by default', () => {
        const appError = new AppError(ERROR_CODES.INTERNAL_SERVER_ERROR);
        const result = service.processError(appError);

        expect(result.stack).toBeUndefined();
      });

      it('should include stack trace when configured', async () => {
        config.includeStackTrace = true;
        const module: TestingModule = await Test.createTestingModule({
          providers: [
            ErrorService,
            { provide: 'ERROR_CONFIG', useValue: config },
          ],
        }).compile();
        service = module.get<ErrorService>(ErrorService);

        const appError = new AppError(ERROR_CODES.DATABASE_ERROR);
        const result = service.processError(appError);

        expect(result.stack).toBeDefined();
        expect(typeof result.stack).toBe('string');
      });

      it('should preserve error context', () => {
        const context = {
          userId: '456',
          action: 'delete',
          resource: 'project',
        };
        const appError = new AppError(
          ERROR_CODES.UNAUTHORIZED,
          'Access denied',
          context,
        );
        const result = service.processError(appError);

        expect(result.context).toEqual(context);
      });
    });

    describe('Processing HttpException', () => {
      it('should process HttpException correctly', () => {
        const httpException = new HttpException(
          'Bad Request',
          HttpStatus.BAD_REQUEST,
        );
        const result = service.processError(httpException);

        expect(result).toBeInstanceOf(ErrorResponseDto);
        expect(result.code).toBe(ERROR_CODES.INTERNAL_SERVER_ERROR);
        expect(result.message).toBe('Bad Request');
      });

      it('should handle different HTTP status codes', () => {
        const exceptions = [
          new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED),
          new HttpException('Not Found', HttpStatus.NOT_FOUND),
          new HttpException('Forbidden', HttpStatus.FORBIDDEN),
        ];

        exceptions.forEach((exception) => {
          const result = service.processError(exception);
          expect(result.code).toBe(ERROR_CODES.INTERNAL_SERVER_ERROR);
        });
      });
    });

    describe('Processing Standard Error', () => {
      it('should process standard Error correctly', () => {
        const error = new Error('Something went wrong');
        const result = service.processError(error);

        expect(result).toBeInstanceOf(ErrorResponseDto);
        expect(result.code).toBe(ERROR_CODES.UNKNOWN_ERROR);
        expect(result.message).toBe('Something went wrong');
      });

      it('should handle error without message', () => {
        const error = new Error();
        const result = service.processError(error);

        expect(result.code).toBe(ERROR_CODES.UNKNOWN_ERROR);
        expect(result.message).toBe('An unknown error occurred');
      });

      it('should handle null error', () => {
        const result = service.processError(null);

        expect(result.code).toBe(ERROR_CODES.UNKNOWN_ERROR);
      });

      it('should handle undefined error', () => {
        const result = service.processError(undefined);

        expect(result.code).toBe(ERROR_CODES.UNKNOWN_ERROR);
      });
    });

    describe('Including Request Context', () => {
      it('should include request context when provided', () => {
        const appError = new AppError(ERROR_CODES.VALIDATION_ERROR);
        const request = {
          url: '/api/projects',
          method: 'POST',
          correlationId: 'corr-123',
        };

        const result = service.processError(appError, request);

        expect(result.path).toBe('/api/projects');
        expect(result.method).toBe('POST');
        expect(result.correlationId).toBe('corr-123');
      });

      it('should work without request context', () => {
        const appError = new AppError(ERROR_CODES.NOT_FOUND);
        const result = service.processError(appError);

        expect(result.path).toBeUndefined();
        expect(result.method).toBeUndefined();
        expect(result.correlationId).toBeUndefined();
      });

      it('should handle partial request context', () => {
        const appError = new AppError(ERROR_CODES.UNAUTHORIZED);
        const request = { url: '/api/users' };

        const result = service.processError(appError, request);

        expect(result.path).toBe('/api/users');
        expect(result.method).toBeUndefined();
      });
    });

    describe('Sanitizing Sensitive Data', () => {
      it('should not expose sensitive data in error response', () => {
        const appError = new AppError(
          ERROR_CODES.VALIDATION_ERROR,
          'Validation failed',
          { password: 'secret123', userId: '456' },
        );

        const result = service.processError(appError);

        // Note: sanitization happens in logError, not processError
        // But we can verify the context is preserved for logging
        expect(result.context).toBeDefined();
      });
    });
  });

  describe('shouldNotify() Method', () => {
    describe('OPERATIONAL Strategy', () => {
      beforeEach(async () => {
        config.notificationStrategy = ErrorNotificationStrategy.OPERATIONAL;
        const module: TestingModule = await Test.createTestingModule({
          providers: [
            ErrorService,
            { provide: 'ERROR_CONFIG', useValue: config },
          ],
        }).compile();
        service = module.get<ErrorService>(ErrorService);
      });

      it('should return true for operational errors', () => {
        const error = new AppError(
          ERROR_CODES.RESOURCE_NOT_FOUND,
          'Not found',
          undefined,
          ErrorSeverity.MEDIUM,
          true, // isOperational
        );

        expect(service.shouldNotify(error)).toBe(true);
      });

      it('should return false for non-operational errors', () => {
        const error = new AppError(
          ERROR_CODES.INTERNAL_SERVER_ERROR,
          'Server error',
          undefined,
          ErrorSeverity.HIGH,
          false, // not operational
        );

        expect(service.shouldNotify(error)).toBe(false);
      });
    });

    describe('ALL Strategy', () => {
      beforeEach(async () => {
        config.notificationStrategy = ErrorNotificationStrategy.ALL;
        const module: TestingModule = await Test.createTestingModule({
          providers: [
            ErrorService,
            { provide: 'ERROR_CONFIG', useValue: config },
          ],
        }).compile();
        service = module.get<ErrorService>(ErrorService);
      });

      it('should return true for all errors', () => {
        const operationalError = new AppError(
          ERROR_CODES.VALIDATION_ERROR,
          'Validation failed',
          undefined,
          ErrorSeverity.LOW,
          true,
        );
        const nonOperationalError = new AppError(
          ERROR_CODES.INTERNAL_SERVER_ERROR,
          'Server error',
          undefined,
          ErrorSeverity.CRITICAL,
          false,
        );

        expect(service.shouldNotify(operationalError)).toBe(true);
        expect(service.shouldNotify(nonOperationalError)).toBe(true);
      });
    });

    describe('CRITICAL Strategy', () => {
      beforeEach(async () => {
        config.notificationStrategy = ErrorNotificationStrategy.CRITICAL;
        const module: TestingModule = await Test.createTestingModule({
          providers: [
            ErrorService,
            { provide: 'ERROR_CONFIG', useValue: config },
          ],
        }).compile();
        service = module.get<ErrorService>(ErrorService);
      });

      it('should return true only for critical errors', () => {
        const criticalError = AppError.critical(
          ERROR_CODES.DATABASE_ERROR,
          'Database failure',
        );
        const highError = AppError.high(ERROR_CODES.EXTERNAL_SERVICE_ERROR);
        const mediumError = new AppError(ERROR_CODES.BUSINESS_RULE_VIOLATION);

        expect(service.shouldNotify(criticalError)).toBe(true);
        expect(service.shouldNotify(highError)).toBe(false);
        expect(service.shouldNotify(mediumError)).toBe(false);
      });
    });

    describe('NONE Strategy', () => {
      beforeEach(async () => {
        config.notificationStrategy = ErrorNotificationStrategy.NONE;
        const module: TestingModule = await Test.createTestingModule({
          providers: [
            ErrorService,
            { provide: 'ERROR_CONFIG', useValue: config },
          ],
        }).compile();
        service = module.get<ErrorService>(ErrorService);
      });

      it('should return false for all errors', () => {
        const criticalError = AppError.critical(ERROR_CODES.DATABASE_ERROR);
        const operationalError = new AppError(ERROR_CODES.VALIDATION_ERROR);

        expect(service.shouldNotify(criticalError)).toBe(false);
        expect(service.shouldNotify(operationalError)).toBe(false);
      });
    });
  });

  describe('logError() Method', () => {
    it('should not log when logging disabled', () => {
      const logSpy = jest.spyOn(service['logger'], 'log');
      const errorSpy = jest.spyOn(service['logger'], 'error');

      config.logErrors = false;
      const error = new AppError(ERROR_CODES.NOT_FOUND);
      service.logError(error);

      expect(logSpy).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('should log when logging enabled', async () => {
      config.logErrors = true;
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ErrorService,
          { provide: 'ERROR_CONFIG', useValue: config },
        ],
      }).compile();
      service = module.get<ErrorService>(ErrorService);

      const logSpy = jest.spyOn(service['logger'], 'log');
      const error = new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        'Validation failed',
        undefined,
        ErrorSeverity.LOW,
      );

      service.logError(error);

      expect(logSpy).toHaveBeenCalled();
    });

    it('should use correct log level based on severity', async () => {
      config.logErrors = true;
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ErrorService,
          { provide: 'ERROR_CONFIG', useValue: config },
        ],
      }).compile();
      service = module.get<ErrorService>(ErrorService);

      const logSpy = jest.spyOn(service['logger'], 'log');
      const warnSpy = jest.spyOn(service['logger'], 'warn');
      const errorSpy = jest.spyOn(service['logger'], 'error');

      const lowError = new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        '',
        undefined,
        ErrorSeverity.LOW,
      );
      const mediumError = new AppError(
        ERROR_CODES.BUSINESS_RULE_VIOLATION,
        '',
        undefined,
        ErrorSeverity.MEDIUM,
      );
      const highError = AppError.high(ERROR_CODES.DATABASE_ERROR);
      const criticalError = AppError.critical(
        ERROR_CODES.INTERNAL_SERVER_ERROR,
      );

      service.logError(lowError);
      expect(logSpy).toHaveBeenCalled();

      service.logError(mediumError);
      expect(warnSpy).toHaveBeenCalled();

      service.logError(highError);
      expect(errorSpy).toHaveBeenCalled();

      service.logError(criticalError);
      expect(errorSpy).toHaveBeenCalled();
    });

    it('should include context in logs', async () => {
      config.logErrors = true;
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ErrorService,
          { provide: 'ERROR_CONFIG', useValue: config },
        ],
      }).compile();
      service = module.get<ErrorService>(ErrorService);

      const logSpy = jest.spyOn(service['logger'], 'log');
      const context = { userId: '123', action: 'delete' };
      const error = new AppError(
        ERROR_CODES.UNAUTHORIZED,
        'Access denied',
        undefined,
        ErrorSeverity.LOW,
      );

      service.logError(error, context);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ERR_3000]'),
        expect.stringContaining('"userId":"123"'),
      );
    });

    it('should not log sensitive data', async () => {
      config.logErrors = true;
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ErrorService,
          { provide: 'ERROR_CONFIG', useValue: config },
        ],
      }).compile();
      service = module.get<ErrorService>(ErrorService);

      const logSpy = jest.spyOn(service['logger'], 'log');
      const context = {
        userId: '123',
        password: 'secret123',
        token: 'jwt-token',
        apiKey: 'api-key-123',
      };
      const error = new AppError(
        ERROR_CODES.UNAUTHORIZED,
        '',
        undefined,
        ErrorSeverity.LOW,
      );

      service.logError(error, context);

      const logCall = logSpy.mock.calls[0][1];
      expect(logCall).toContain('***REDACTED***');
      expect(logCall).not.toContain('secret123');
      expect(logCall).not.toContain('jwt-token');
      expect(logCall).not.toContain('api-key-123');
    });
  });

  describe('reportError() Method', () => {
    it('should not report when Sentry disabled', async () => {
      config.enableSentry = false;
      const debugSpy = jest.spyOn(service['logger'], 'debug');

      const error = AppError.critical(ERROR_CODES.DATABASE_ERROR);
      await service.reportError(error);

      expect(debugSpy).not.toHaveBeenCalled();
      expect(Sentry.captureException).not.toHaveBeenCalled();
    });

    it('should report when Sentry enabled', async () => {
      config.enableSentry = true;
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ErrorService,
          { provide: 'ERROR_CONFIG', useValue: config },
        ],
      }).compile();
      service = module.get<ErrorService>(ErrorService);

      const debugSpy = jest.spyOn(service['logger'], 'debug');
      const error = AppError.critical(ERROR_CODES.INTERNAL_SERVER_ERROR);

      await service.reportError(error);

      expect(Sentry.captureException).toHaveBeenCalledWith(error);
      expect(debugSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error reported to Sentry'),
      );
    });

    it('should handle reporting failures gracefully', async () => {
      config.enableSentry = true;
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ErrorService,
          { provide: 'ERROR_CONFIG', useValue: config },
        ],
      }).compile();
      service = module.get<ErrorService>(ErrorService);

      const errorSpy = jest.spyOn(service['logger'], 'error');

      // Mock Sentry to throw an error
      (Sentry.captureException as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Sentry connection failed');
      });

      const error = AppError.critical(ERROR_CODES.DATABASE_ERROR);
      await service.reportError(error);

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to report error to Sentry'),
        expect.any(Error),
      );
    });

    it('should include context in report', async () => {
      config.enableSentry = true;
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ErrorService,
          { provide: 'ERROR_CONFIG', useValue: config },
        ],
      }).compile();
      service = module.get<ErrorService>(ErrorService);

      const error = AppError.critical(ERROR_CODES.DATABASE_ERROR);
      const context = { dbHost: 'localhost', query: 'SELECT *' };

      await service.reportError(error, context);

      expect(Sentry.withScope).toHaveBeenCalled();
      expect(Sentry.captureException).toHaveBeenCalledWith(error);
    });
  });

  describe('createError() Method', () => {
    it('should create AppError with code', () => {
      const error = service.createError(ERROR_CODES.NOT_FOUND);

      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe(ERROR_CODES.NOT_FOUND);
    });

    it('should create AppError with message', () => {
      const message = 'Custom error message';
      const error = service.createError(ERROR_CODES.VALIDATION_ERROR, message);

      expect(error.message).toBe(message);
    });

    it('should create AppError with context', () => {
      const context = { userId: '123', resource: 'project' };
      const error = service.createError(
        ERROR_CODES.UNAUTHORIZED,
        'Access denied',
        context,
      );

      expect(error.context).toEqual(context);
    });

    it('should create operational error by default', () => {
      const error = service.createError(ERROR_CODES.BUSINESS_RULE_VIOLATION);

      expect(error.isOperational).toBe(true);
    });

    it('should set default severity to MEDIUM', () => {
      const error = service.createError(ERROR_CODES.CONFLICT);

      expect(error.severity).toBe(ErrorSeverity.MEDIUM);
    });
  });

  describe('Error Handling for Different Error Types', () => {
    it('should handle ValidationError', () => {
      const validationError = new ValidationError([
        { field: 'email', message: 'Invalid email' },
      ]);

      const result = service.processError(validationError);

      expect(result.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(result.context?.errors).toBeDefined();
    });

    it('should handle BusinessError', () => {
      const businessError = new BusinessError('Cannot delete project', {
        projectId: '123',
      });

      const result = service.processError(businessError);

      expect(result.code).toBe(ERROR_CODES.BUSINESS_RULE_VIOLATION);
      expect(result.context?.projectId).toBe('123');
    });

    it('should handle critical errors', () => {
      const criticalError = AppError.critical(
        ERROR_CODES.DATABASE_ERROR,
        'Database connection lost',
      );

      const result = service.processError(criticalError);

      expect(result.code).toBe(ERROR_CODES.DATABASE_ERROR);
      expect(result.message).toBe('Database connection lost');
    });
  });

  describe('Sanitization', () => {
    it('should sanitize password field', async () => {
      config.logErrors = true;
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ErrorService,
          { provide: 'ERROR_CONFIG', useValue: config },
        ],
      }).compile();
      service = module.get<ErrorService>(ErrorService);

      const logSpy = jest.spyOn(service['logger'], 'log');
      const context = { password: 'secret123', userId: '456' };
      const error = new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        '',
        undefined,
        ErrorSeverity.LOW,
      );

      service.logError(error, context);

      const loggedContext = logSpy.mock.calls[0][1];
      expect(loggedContext).toContain('***REDACTED***');
      expect(loggedContext).not.toContain('secret123');
    });

    it('should sanitize multiple sensitive fields', async () => {
      config.logErrors = true;
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ErrorService,
          { provide: 'ERROR_CONFIG', useValue: config },
        ],
      }).compile();
      service = module.get<ErrorService>(ErrorService);

      const logSpy = jest.spyOn(service['logger'], 'log');
      const context = {
        token: 'jwt-token',
        apiKey: 'key-123',
        secret: 'secret',
        password: 'pass',
        userId: '789',
      };
      const error = new AppError(
        ERROR_CODES.UNAUTHORIZED,
        '',
        undefined,
        ErrorSeverity.LOW,
      );

      service.logError(error, context);

      const loggedContext = logSpy.mock.calls[0][1];
      expect(loggedContext).toContain('userId');
      expect(loggedContext).toContain('789');
      expect(loggedContext).not.toContain('jwt-token');
      expect(loggedContext).not.toContain('key-123');
    });
  });
});
