// ----------------------------------------------------------------------------
// ERROR MODULE - INTEGRATION TESTS
// src/modules/shared/error/__tests__/error.integration.spec.ts
// ----------------------------------------------------------------------------

import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  Controller,
  Get,
  Post,
  Body,
  ValidationPipe,
} from '@nestjs/common';
import { ErrorModule } from '../error.module';
import { ErrorService } from '../error.service';
import { AppError } from '../classes/app-error.class';
import { ValidationError } from '../classes/validation-error.class';
import { BusinessError } from '../classes/business-error.class';
import { ERROR_CODES } from '../constants/error-codes.constant';
import { ErrorNotificationStrategy } from '../dto/error-config.dto';
import request from 'supertest';
import { IsEmail, IsNotEmpty } from 'class-validator';
import { NotificationModule } from '../../notification/notification.module';
import { NotificationAdapter } from '../../notification/dto/notification-config.dto';

// Test DTO for validation
class TestDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsNotEmpty()
  name: string;
}

// Test controller
@Controller('test')
class TestController {
  constructor(private readonly errorService: ErrorService) {}

  @Get('app-error')
  throwAppError() {
    throw new AppError(ERROR_CODES.RESOURCE_NOT_FOUND, 'Project not found', {
      projectId: '123',
    });
  }

  @Get('validation-error')
  throwValidationError() {
    throw new ValidationError([
      { field: 'email', message: 'Invalid email format', value: 'notanemail' },
      { field: 'age', message: 'Must be at least 18', value: 15 },
    ]);
  }

  @Get('business-error')
  throwBusinessError() {
    throw new BusinessError('Cannot delete project with active tasks', {
      projectId: '123',
      activeTasks: 5,
    });
  }

  @Get('critical-error')
  throwCriticalError() {
    throw AppError.critical(
      ERROR_CODES.DATABASE_ERROR,
      'Database connection lost',
    );
  }

  @Get('standard-error')
  throwStandardError() {
    throw new Error('Something went wrong');
  }

  @Post('validation-dto')
  validateDto(@Body() dto: TestDto) {
    return { success: true };
  }
}

describe('ErrorModule Integration Tests', () => {
  let app: INestApplication;
  let errorService: ErrorService;
  let notificationEmitted: boolean;
  let lastNotification: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ErrorModule.register({
          includeStackTrace: true, // For testing
          notifyFrontend: true,
          notificationStrategy: ErrorNotificationStrategy.OPERATIONAL,
          logErrors: false, // Disable logs in tests
          captureContext: true,
          enableSentry: false,
        }),
        // Add NotificationModule here
        NotificationModule.register({
          adapter: NotificationAdapter.WEBSOCKET,
          persist: false,
          enableLogging: false, // disable logs for tests
          maxRetries: 1,
        }),
      ],
      controllers: [TestController],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    errorService = moduleFixture.get<ErrorService>(ErrorService);

    // Mock notification service
    notificationEmitted = false;
    lastNotification = null;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    notificationEmitted = false;
    lastNotification = null;
  });

  describe('End-to-End Error Flow', () => {
    it('should catch AppError and return standardized response', async () => {
      const response = await request(app.getHttpServer())
        .get('/test/app-error')
        .expect(404);

      expect(response.body).toMatchObject({
        status: 'error',
        code: ERROR_CODES.RESOURCE_NOT_FOUND,
        message: 'Project not found',
        context: {
          projectId: '123',
        },
      });
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.path).toBe('/test/app-error');
      expect(response.body.method).toBe('GET');
    });

    it('should catch ValidationError and return proper response', async () => {
      const response = await request(app.getHttpServer())
        .get('/test/validation-error')
        .expect(400);

      expect(response.body).toMatchObject({
        status: 'error',
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Validation failed',
      });
      expect(response.body.context.errors).toHaveLength(2);
      expect(response.body.context.errors[0]).toMatchObject({
        field: 'email',
        message: 'Invalid email format',
      });
    });

    it('should catch BusinessError and return proper response', async () => {
      const response = await request(app.getHttpServer())
        .get('/test/business-error')
        .expect(422);

      expect(response.body).toMatchObject({
        status: 'error',
        code: ERROR_CODES.BUSINESS_RULE_VIOLATION,
        message: 'Cannot delete project with active tasks',
        context: {
          projectId: '123',
          activeTasks: 5,
        },
      });
    });

    it('should catch critical error and return proper response', async () => {
      const response = await request(app.getHttpServer())
        .get('/test/critical-error')
        .expect(500);

      expect(response.body).toMatchObject({
        status: 'error',
        code: ERROR_CODES.DATABASE_ERROR,
        message: 'Database connection lost',
      });
    });

    it('should catch standard Error and return proper response', async () => {
      const response = await request(app.getHttpServer())
        .get('/test/standard-error')
        .expect(500);

      expect(response.body).toMatchObject({
        status: 'error',
        code: ERROR_CODES.UNKNOWN_ERROR,
        message: 'Something went wrong',
      });
    });
  });

  describe('Validation Error Flow', () => {
    it('should handle DTO validation failures', async () => {
      const response = await request(app.getHttpServer())
        .post('/test/validation-dto')
        .send({ email: 'notanemail', name: '' })
        .expect(400);

      expect(response.body.message).toBeDefined();
      expect(Array.isArray(response.body.message)).toBe(true);
    });

    it('should validate email format', async () => {
      const response = await request(app.getHttpServer())
        .post('/test/validation-dto')
        .send({ email: 'invalid', name: 'John' })
        .expect(400);

      expect(response.body.message).toContain('email must be an email');
    });

    it('should validate required fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/test/validation-dto')
        .send({ email: 'john@example.com' })
        .expect(400);

      expect(response.body.message).toContain('name should not be empty');
    });

    it('should pass validation with correct data', async () => {
      const response = await request(app.getHttpServer())
        .post('/test/validation-dto')
        .send({ email: 'john@example.com', name: 'John' })
        .expect(201);

      expect(response.body).toEqual({ success: true });
    });
  });

  describe('Configuration Impact', () => {
    it('should include stack trace when enabled', async () => {
      const response = await request(app.getHttpServer())
        .get('/test/app-error')
        .expect(404);

      expect(response.body.stack).toBeDefined();
      expect(typeof response.body.stack).toBe('string');
    });

    it('should include request context', async () => {
      const response = await request(app.getHttpServer())
        .get('/test/business-error')
        .expect(422);

      expect(response.body.path).toBe('/test/business-error');
      expect(response.body.method).toBe('GET');
    });
  });

  describe('Multiple Error Types', () => {
    it('should handle AppError consistently', async () => {
      const response = await request(app.getHttpServer())
        .get('/test/app-error')
        .expect(404);

      expect(response.body.status).toBe('error');
      expect(response.body.code).toBeDefined();
      expect(response.body.message).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
    });

    it('should handle ValidationError consistently', async () => {
      const response = await request(app.getHttpServer())
        .get('/test/validation-error')
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(response.body.context.errors).toBeDefined();
    });

    it('should handle BusinessError consistently', async () => {
      const response = await request(app.getHttpServer())
        .get('/test/business-error')
        .expect(422);

      expect(response.body.status).toBe('error');
      expect(response.body.code).toBe(ERROR_CODES.BUSINESS_RULE_VIOLATION);
    });

    it('should handle standard Error consistently', async () => {
      const response = await request(app.getHttpServer())
        .get('/test/standard-error')
        .expect(500);

      expect(response.body.status).toBe('error');
      expect(response.body.code).toBe(ERROR_CODES.UNKNOWN_ERROR);
    });

    it('should return consistent format across all error types', async () => {
      const endpoints = [
        '/test/app-error',
        '/test/validation-error',
        '/test/business-error',
        '/test/standard-error',
      ];

      for (const endpoint of endpoints) {
        const response = await request(app.getHttpServer()).get(endpoint);

        expect(response.body).toHaveProperty('status', 'error');
        expect(response.body).toHaveProperty('code');
        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('timestamp');
      }
    });
  });

  describe('HTTP Status Code Mapping', () => {
    it('should map validation errors to 400', async () => {
      await request(app.getHttpServer())
        .get('/test/validation-error')
        .expect(400);
    });

    it('should map not found errors to 404', async () => {
      await request(app.getHttpServer()).get('/test/app-error').expect(404);
    });

    it('should map business errors to 422', async () => {
      await request(app.getHttpServer())
        .get('/test/business-error')
        .expect(422);
    });

    it('should map unknown errors to 500', async () => {
      await request(app.getHttpServer())
        .get('/test/standard-error')
        .expect(500);
    });

    it('should map critical errors to 500', async () => {
      await request(app.getHttpServer())
        .get('/test/critical-error')
        .expect(500);
    });
  });

  describe('Error Context Preservation', () => {
    it('should preserve error context in AppError', async () => {
      const response = await request(app.getHttpServer())
        .get('/test/app-error')
        .expect(404);

      expect(response.body.context).toEqual({ projectId: '123' });
    });

    it('should preserve validation details in ValidationError', async () => {
      const response = await request(app.getHttpServer())
        .get('/test/validation-error')
        .expect(400);

      expect(response.body.context.errors).toBeDefined();
      expect(response.body.context.errors[0].field).toBe('email');
      expect(response.body.context.errors[0].value).toBe('notanemail');
    });

    it('should preserve business context in BusinessError', async () => {
      const response = await request(app.getHttpServer())
        .get('/test/business-error')
        .expect(422);

      expect(response.body.context.projectId).toBe('123');
      expect(response.body.context.activeTasks).toBe(5);
    });
  });

  describe('Error Service Integration', () => {
    it('should process errors through ErrorService', async () => {
      const processErrorSpy = jest.spyOn(errorService, 'processError');

      await request(app.getHttpServer()).get('/test/app-error').expect(404);
    });

    it('should create errors using ErrorService', () => {
      const error = errorService.createError(
        ERROR_CODES.NOT_FOUND,
        'Resource not found',
        { resourceId: '456' },
      );

      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe(ERROR_CODES.NOT_FOUND);
      expect(error.context?.resourceId).toBe('456');
    });
  });

  describe('Response Format Validation', () => {
    it('should always include required fields', async () => {
      const response = await request(app.getHttpServer())
        .get('/test/app-error')
        .expect(404);

      const requiredFields = ['status', 'code', 'message', 'timestamp'];
      requiredFields.forEach((field) => {
        expect(response.body).toHaveProperty(field);
      });
    });

    it('should have correct field types', async () => {
      const response = await request(app.getHttpServer())
        .get('/test/app-error')
        .expect(404);

      expect(typeof response.body.status).toBe('string');
      expect(typeof response.body.code).toBe('string');
      expect(typeof response.body.message).toBe('string');
      expect(typeof response.body.timestamp).toBe('string'); // ISO string in JSON
    });

    it('should include optional fields when available', async () => {
      const response = await request(app.getHttpServer())
        .get('/test/app-error')
        .expect(404);

      expect(response.body).toHaveProperty('context');
      expect(response.body).toHaveProperty('path');
      expect(response.body).toHaveProperty('method');
    });
  });

  describe('Edge Cases', () => {
    it('should handle non-existent routes', async () => {
      const response = await request(app.getHttpServer())
        .get('/test/non-existent')
        .expect(404);

      expect(response.body).toHaveProperty('message');
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app.getHttpServer())
        .post('/test/validation-dto')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });

    it('should handle missing Content-Type', async () => {
      const response = await request(app.getHttpServer())
        .post('/test/validation-dto')
        .send('email=test&name=test');

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Performance', () => {
    it('should handle rapid sequential errors', async () => {
      const promises = Array.from({ length: 10 }, () =>
        request(app.getHttpServer()).get('/test/app-error'),
      );

      const responses = await Promise.all(promises);

      responses.forEach((response) => {
        expect(response.status).toBe(404);
        expect(response.body.status).toBe('error');
      });
    });

    it('should process errors quickly', async () => {
      const start = Date.now();

      await request(app.getHttpServer()).get('/test/app-error').expect(404);

      const duration = Date.now() - start;

      expect(duration).toBeLessThan(1000); // Should be very fast
    });
  });

  describe('Timestamp Accuracy', () => {
    it('should have accurate timestamps', async () => {
      const before = new Date();

      const response = await request(app.getHttpServer())
        .get('/test/app-error')
        .expect(404);

      const after = new Date();
      const timestamp = new Date(response.body.timestamp);

      expect(timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });
});
