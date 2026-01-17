/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
// src/modules/core/auth/__tests__/auth.integration.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AuthModule } from '../auth.module';
import { DatabaseModule } from '@database/database.module';
import { ContextModule } from '@shared/context/context.module';
import { NotificationModule } from '@shared/notification/notification.module';
import { NotificationAdapter } from '@shared/notification/dto/notification-config.dto';
import { ErrorModule } from '@shared/error/error.module';
import { ErrorNotificationStrategy } from '@shared/error/dto/error-config.dto';
import { ERROR_CODES } from '@shared/error/constants/error-codes.constant';

describe('AuthModule Integration Tests (OTP Flow)', () => {
  let app: INestApplication;

  // Test data with unique emails for each test run
  const timestamp = Date.now();
  const testUsers = {
    client: {
      email: `client-${timestamp}@test.com`,
      password: 'SecurePass123!',
      organizationName: 'Test Corp',
      industry: 'Technology',
    },
    supervisor: {
      email: `supervisor-${timestamp}@test.com`,
      password: 'SecurePass123!',
      universityId: 'valid-university-id',
    },
    student: {
      email: `student-${timestamp}@test.com`,
      password: 'SecurePass123!',
      matricNumber: `MAT2021/${timestamp}`,
      skills: ['JavaScript', 'React', 'Node.js'],
    },
    university: {
      email: `university-${timestamp}@test.com`,
      password: 'SecurePass123!',
      name: 'Test University',
      location: 'Lagos, Nigeria',
    },
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        DatabaseModule,
        ContextModule.register(),
        NotificationModule.register({
          adapter: NotificationAdapter.WEBSOCKET,
          persist: false,
          enableLogging: false,
        }),
        ErrorModule.register({
          includeStackTrace: true,
          notifyFrontend: false,
          notificationStrategy: ErrorNotificationStrategy.NONE,
          logErrors: false,
          captureContext: false,
        }),
        AuthModule,
      ],
    }).compile();

    app = moduleRef.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // ==========================================================================
  // VALIDATION TESTS (No external dependencies)
  // ==========================================================================

  describe('POST /auth/register/client - Validation Tests', () => {
    it('should validate required fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register/client')
        .send({
          email: 'test@test.com',
          // Missing password and organizationName
        })
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('should validate email format', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register/client')
        .send({
          email: 'invalid-email',
          password: 'SecurePass123!',
          organizationName: 'Test',
        })
        .expect(400);

      if (Array.isArray(response.body.message)) {
        expect(response.body.message).toEqual(
          expect.arrayContaining([expect.stringContaining('email')]),
        );
      } else {
        expect(response.body.message).toContain('email');
      }
    });

    it('should validate password strength', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register/client')
        .send({
          email: `test2-${Date.now()}@test.com`,
          password: 'weak',
          organizationName: 'Test',
        })
        .expect(400);

      expect(response.body.message).toBeDefined();
    });
  });

  describe('POST /auth/verify-otp - Validation Tests', () => {
    it('should validate OTP format', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/verify-otp')
        .send({
          email: testUsers.client.email,
          token: '123', // Too short
        })
        .expect(400);

      expect(response.body.message).toBeDefined();
    });
  });

  // ==========================================================================
  // LOGIN VALIDATION TESTS
  // ==========================================================================

  describe('POST /auth/login/initiate - Validation Tests', () => {
    it('should reject non-existent user', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login/initiate')
        .send({
          email: 'nonexistent@test.com',
        })
        .expect(404);

      expect(response.body.code).toBe(ERROR_CODES.RESOURCE_NOT_FOUND);
    });

    it('should validate email format', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login/initiate')
        .send({
          email: 'invalid-email',
        })
        .expect(400);

      expect(response.body.message).toBeDefined();
    });
  });

  describe('POST /auth/login/verify - Validation Tests', () => {
    it('should reject invalid OTP', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login/verify')
        .send({
          email: testUsers.client.email,
          token: '000000',
        })
        .expect(401);

      expect(response.body.message).toContain('Invalid or expired OTP');
    });
  });

  // ==========================================================================
  // OTHER AUTH ENDPOINTS (Updated for OTP)
  // ==========================================================================

  describe('POST /auth/verify-session', () => {
    it('should reject invalid token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/verify-session')
        .send({ accessToken: 'invalid-token' })
        .expect(401);

      expect(response.body.code).toBe(ERROR_CODES.UNAUTHORIZED);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should reject invalid refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-refresh-token' })
        .expect(401);

      expect(response.body.code).toBe(ERROR_CODES.UNAUTHORIZED);
    });
  });

  // ==========================================================================
  // ERROR HANDLING
  // ==========================================================================

  describe('Error Handling', () => {
    it('should handle malformed JSON', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login/initiate')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);

      expect(response.status).toBe(400);
    });

    it('should validate extra fields are rejected', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register/client')
        .send({
          email: `test-${Date.now()}@test.com`,
          password: 'SecurePass123!',
          organizationName: 'Test',
          extraField: 'should be rejected',
        })
        .expect(400);

      expect(response.status).toBe(400);
    });
  });

  // ==========================================================================
  // ROUTE EXISTENCE TESTS
  // ==========================================================================

  describe('Route Existence Tests', () => {
    it('should respond to /auth/register/client', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register/client')
        .send({});

      // Should return 400 for validation error, not 404 for route not found
      expect(response.status).not.toBe(404);
    });

    it('should respond to /auth/register/university', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register/university')
        .send({});

      expect(response.status).not.toBe(404);
    });

    it('should respond to /auth/register/supervisor', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register/supervisor')
        .send({});

      expect(response.status).not.toBe(404);
    });

    it('should respond to /auth/register/student', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register/student')
        .send({});

      expect(response.status).not.toBe(404);
    });

    it('should respond to /auth/login/initiate', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login/initiate')
        .send({});

      expect(response.status).not.toBe(404);
    });

    it('should respond to /auth/verify-otp', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/verify-otp')
        .send({});

      expect(response.status).not.toBe(404);
    });

    it('should respond to /auth/login/verify', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login/verify')
        .send({});

      expect(response.status).not.toBe(404);
    });

    it('should respond to /auth/resend-otp', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/resend-otp')
        .send({});

      expect(response.status).not.toBe(404);
    });

    it('should respond to /auth/verify-session', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/verify-session')
        .send({});

      expect(response.status).not.toBe(404);
    });

    it('should respond to /auth/refresh', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({});

      expect(response.status).not.toBe(404);
    });

    it('should respond to /auth/logout', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/logout')
        .send({});

      expect(response.status).not.toBe(404);
    });
  });
});
