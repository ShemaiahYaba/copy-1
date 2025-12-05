// ----------------------------------------------------------------------------
// APP ERROR FILTER - UNIT TESTS
// src/modules/shared/error/__tests__/app-error.filter.spec.ts
// ----------------------------------------------------------------------------

import { Test, TestingModule } from '@nestjs/testing';
import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { AppErrorFilter } from '@shared/error/filters/app-error/app-error.filter';
import { ErrorService } from '@shared/error/error.service';
import {
  ErrorConfigDto,
  ErrorNotificationStrategy,
} from '@shared/error/dto/error-config.dto';
import { AppError } from '@shared/error/classes/app-error.class';
import { ValidationError } from '@shared/error/classes/validation-error.class';
import { BusinessError } from '@shared/error/classes/business-error.class';
import { ERROR_CODES } from '@shared/error/constants/error-codes.constant';
import { ErrorSeverity } from '@shared/error/interfaces/error.interface';
import { NotificationService } from '@shared/notification/notification.service';

describe('AppErrorFilter', () => {
  let filter: AppErrorFilter;
  let errorService: ErrorService;
  let notificationService: NotificationService;
  let mockArgumentsHost: ArgumentsHost;
  let mockResponse: any;
  let mockRequest: any;

  // --- Mock config ---
  const config: ErrorConfigDto = {
    includeStackTrace: false,
    notifyFrontend: true,
    notificationStrategy: ErrorNotificationStrategy.OPERATIONAL,
    logErrors: false,
    captureContext: true,
    enableSentry: false,
  };

  // --- Mock NotificationService ---
  const notificationServiceMock = {
    push: jest.fn().mockResolvedValue({}),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    getHistory: jest.fn(),
    broadcast: jest.fn().mockResolvedValue({}),
  };

  beforeEach(async () => {
    // --- Mock request/response ---
    mockRequest = {
      url: '/api/test',
      method: 'GET',
      correlationId: 'test-correlation-id',
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockArgumentsHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
      getArgByIndex: jest.fn(),
      getArgs: jest.fn(),
      getType: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
    };

    // --- Compile Testing Module ---
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppErrorFilter,
        ErrorService,
        { provide: 'ERROR_CONFIG', useValue: config },
        { provide: NotificationService, useValue: notificationServiceMock },
      ],
    }).compile();

    filter = module.get<AppErrorFilter>(AppErrorFilter);
    errorService = module.get<ErrorService>(ErrorService);
    notificationService = module.get<NotificationService>(NotificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // -------------------
  // Initialization tests
  // -------------------
  it('should be defined', () => expect(filter).toBeDefined());
  it('should have errorService injected', () =>
    expect((filter as any).errorService).toBeDefined());
  it('should have config injected', () =>
    expect((filter as any).config).toBeDefined());

  // -------------------
  // Basic error catching
  // -------------------
  it('should catch standard Error without throwing', () => {
    const exception = new Error('Test error');
    expect(() => filter.catch(exception, mockArgumentsHost)).not.toThrow();
  });

  it('should process AppError through ErrorService', () => {
    const spy = jest.spyOn(errorService, 'processError');
    const exception = new AppError(ERROR_CODES.NOT_FOUND);
    filter.catch(exception, mockArgumentsHost);
    expect(spy).toHaveBeenCalledWith(exception, mockRequest);
  });

  it('should call notificationService.push for operational errors', () => {
    const exception = new AppError(
      ERROR_CODES.NOT_FOUND,
      'Not found',
      {},
      ErrorSeverity.MEDIUM,
      true,
    );
    filter.catch(exception, mockArgumentsHost);
    expect(notificationService.push).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'ERROR',
        message: 'Not found',
        context: expect.objectContaining({ code: ERROR_CODES.NOT_FOUND }),
      }),
    );
  });

  it('should not call notificationService.push for non-operational errors', () => {
    const exception = new AppError(
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      'Internal',
      {},
      ErrorSeverity.CRITICAL,
      false,
    );
    filter.catch(exception, mockArgumentsHost);
    expect(notificationService.push).not.toHaveBeenCalled();
  });

  it('should return correct HTTP status codes', () => {
    const mapping: [string, number][] = [
      [ERROR_CODES.VALIDATION_ERROR, 400],
      [ERROR_CODES.UNAUTHORIZED, 401],
      [ERROR_CODES.INSUFFICIENT_PERMISSIONS, 403],
      [ERROR_CODES.NOT_FOUND, 404],
      [ERROR_CODES.ALREADY_EXISTS, 409],
      [ERROR_CODES.BUSINESS_RULE_VIOLATION, 422],
      [ERROR_CODES.INTERNAL_SERVER_ERROR, 500],
    ];

    mapping.forEach(([code, status]) => {
      filter.catch(new AppError(code as any), mockArgumentsHost);
      expect(mockResponse.status).toHaveBeenCalledWith(status);
    });

    filter.catch(
      new HttpException('Bad Request', HttpStatus.BAD_REQUEST),
      mockArgumentsHost,
    );
    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
  });

  it('should include request path and method in response', () => {
    const exception = new AppError(ERROR_CODES.NOT_FOUND);
    filter.catch(exception, mockArgumentsHost);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/api/test',
        method: 'GET',
      }),
    );
  });

  it('should include correlationId if present', () => {
    const exception = new AppError(ERROR_CODES.INTERNAL_SERVER_ERROR);
    filter.catch(exception, mockArgumentsHost);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ correlationId: 'test-correlation-id' }),
    );
  });

  it('should always include code and message', () => {
    const exception = new AppError(ERROR_CODES.INTERNAL_SERVER_ERROR);
    filter.catch(exception, mockArgumentsHost);
    const resp = mockResponse.json.mock.calls[0][0];
    expect(resp.code).toBeDefined();
    expect(resp.message).toBeDefined();
  });

  it('should not throw if notificationService.push fails', () => {
    (notificationService.push as jest.Mock).mockRejectedValueOnce(
      new Error('fail'),
    );
    expect(() =>
      filter.catch(
        new AppError(ERROR_CODES.VALIDATION_ERROR),
        mockArgumentsHost,
      ),
    ).not.toThrow();
  });

  it('should handle null or undefined exceptions gracefully', () => {
    expect(() => filter.catch(null, mockArgumentsHost)).not.toThrow();
    expect(() => filter.catch(undefined, mockArgumentsHost)).not.toThrow();
  });

  it('should handle BusinessError and ValidationError correctly', () => {
    filter.catch(new BusinessError('fail'), mockArgumentsHost);
    filter.catch(
      new ValidationError([{ field: 'email', message: 'Invalid' }]),
      mockArgumentsHost,
    );
    expect(mockResponse.json).toHaveBeenCalledTimes(2);
  });
});
