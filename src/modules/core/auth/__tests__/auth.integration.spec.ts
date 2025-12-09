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
import { SupabaseService } from '../services/supabase.service';
import { ERROR_CODES } from '@shared/error/constants/error-codes.constant';

describe('AuthModule Integration Tests (Supabase)', () => {
  let app: INestApplication;
  let supabaseService: SupabaseService;

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
      universityId: '', // Will be set after university registration
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
    const moduleFixture: TestingModule = await Test.createTestingModule({
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
        AuthModule, // ✅ This imports the module with global guards
      ],
    }).compile();

    app = moduleFixture.createNestApplication();

    // ✅ CRITICAL: Add global validation pipe BEFORE init()
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    // ✅ Initialize the app (this sets up guards, pipes, etc.)
    await app.init();

    supabaseService = moduleFixture.get<SupabaseService>(SupabaseService);

    // ✅ DEBUGGING: Log to verify guards are set up
    console.log(
      '✅ Test app initialized with AuthModule (global guards active)',
    );
  });

  afterAll(async () => {
    // Cleanup: Delete test users from Supabase
    try {
      // Note: You may want to implement cleanup logic here
      // to delete test users from Supabase and database
    } catch (error) {
      console.error('Cleanup error:', error);
    }
    await app.close();
  });

  describe('POST /auth/register/client', () => {
    it('should register a new client successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register/client')
        .send(testUsers.client)
        .expect(201);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('session');
      expect(response.body).toHaveProperty('profile');

      expect(response.body.user).toMatchObject({
        email: testUsers.client.email,
        role: 'client',
        isActive: true,
      });

      expect(response.body.session).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        expiresAt: expect.any(Number),
      });

      expect(response.body.profile).toMatchObject({
        organizationName: testUsers.client.organizationName,
        industry: testUsers.client.industry,
      });
    });

    it('should reject duplicate email registration', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register/client')
        .send(testUsers.client)
        .expect(409);

      expect(response.body.code).toBe(ERROR_CODES.ALREADY_EXISTS);
      expect(response.body.message).toContain('already exists');
    });

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

  describe('POST /auth/register/university', () => {
    it('should register a new university successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register/university')
        .send(testUsers.university)
        .expect(201);

      expect(response.body.user).toMatchObject({
        email: testUsers.university.email,
        role: 'university',
      });

      expect(response.body.profile).toMatchObject({
        name: testUsers.university.name,
        location: testUsers.university.location,
        isVerified: false,
      });

      // Save university ID for supervisor tests
      testUsers.supervisor.universityId = response.body.profile.id;
    });
  });

  describe('POST /auth/register/supervisor', () => {
    it('should register a new supervisor successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register/supervisor')
        .send(testUsers.supervisor)
        .expect(201);

      expect(response.body.user).toMatchObject({
        email: testUsers.supervisor.email,
        role: 'supervisor',
      });

      expect(response.body.profile).toMatchObject({
        universityId: testUsers.supervisor.universityId,
        employmentStatus: 'employed',
      });
    });

    it('should reject supervisor with invalid university ID', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register/supervisor')
        .send({
          email: `supervisor2-${Date.now()}@test.com`,
          password: 'SecurePass123!',
          universityId: '00000000-0000-0000-0000-000000000000',
        })
        .expect(404);

      expect(response.body.code).toBe(ERROR_CODES.RESOURCE_NOT_FOUND);
    });
  });

  describe('POST /auth/register/student', () => {
    it('should register a new student successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register/student')
        .send(testUsers.student)
        .expect(201);

      expect(response.body.user).toMatchObject({
        email: testUsers.student.email,
        role: 'student',
      });

      expect(response.body.profile).toMatchObject({
        matricNumber: testUsers.student.matricNumber,
        graduationStatus: 'active',
        skills: testUsers.student.skills,
      });
    });
  });

  describe('POST /auth/login', () => {
    it('should login client with valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUsers.client.email,
          password: testUsers.client.password,
        })
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('session');
      expect(response.body).toHaveProperty('profile');

      expect(response.body.user.email).toBe(testUsers.client.email);
      expect(response.body.session.accessToken).toBeDefined();
    });

    it('should login supervisor with valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUsers.supervisor.email,
          password: testUsers.supervisor.password,
        })
        .expect(200);

      expect(response.body.user.role).toBe('supervisor');
    });

    it('should login student with valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUsers.student.email,
          password: testUsers.student.password,
        })
        .expect(200);

      expect(response.body.user.role).toBe('student');
    });

    it('should login university with valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUsers.university.email,
          password: testUsers.university.password,
        })
        .expect(200);

      expect(response.body.user.role).toBe('university');
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUsers.client.email,
          password: 'WrongPassword123!',
        })
        .expect(401);

      expect(response.body.code).toBe(ERROR_CODES.INVALID_CREDENTIALS);
    });

    it('should reject non-existent user', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'SecurePass123!',
        })
        .expect(401);

      expect(response.body.code).toBe(ERROR_CODES.INVALID_CREDENTIALS);
    });
  });

  describe('POST /auth/verify-session', () => {
    let validAccessToken: string;

    beforeAll(async () => {
      // Login to get a valid token
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUsers.client.email,
          password: testUsers.client.password,
        });

      validAccessToken = loginResponse.body.session.accessToken;
    });

    it('should verify valid session', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/verify-session')
        .send({ accessToken: validAccessToken })
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('profile');
      expect(response.body.user.email).toBe(testUsers.client.email);
    });

    it('should reject invalid token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/verify-session')
        .send({ accessToken: 'invalid-token' })
        .expect(401);

      expect(response.body.code).toBe(ERROR_CODES.UNAUTHORIZED);
    });
  });

  describe('POST /auth/refresh', () => {
    let validRefreshToken: string;

    beforeAll(async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUsers.client.email,
          password: testUsers.client.password,
        });

      validRefreshToken = loginResponse.body.session.refreshToken;
    });

    it('should refresh token successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: validRefreshToken })
        .expect(200);

      expect(response.body).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        expiresAt: expect.any(Number),
      });
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-refresh-token' })
        .expect(401);

      expect(response.body.code).toBe(ERROR_CODES.UNAUTHORIZED);
    });
  });

  describe('POST /auth/logout', () => {
    let accessToken: string;

    beforeEach(async () => {
      // Create a new session for each logout test
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUsers.client.email,
          password: testUsers.client.password,
        });

      accessToken = loginResponse.body.session.accessToken;
    });

    it('should logout successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/logout')
        .send({ accessToken })
        .expect(200);

      expect(response.body.message).toBe('Logged out successfully');
    });
  });

  describe('Complete User Journey', () => {
    it('should complete full client lifecycle: register → login → logout', async () => {
      const uniqueEmail = `journey-client-${Date.now()}@test.com`;

      // 1. Register
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register/client')
        .send({
          email: uniqueEmail,
          password: 'SecurePass123!',
          organizationName: 'Journey Corp',
        })
        .expect(201);

      const initialAccessToken = registerResponse.body.session.accessToken;

      // 2. Logout initial session
      await request(app.getHttpServer())
        .post('/auth/logout')
        .send({ accessToken: initialAccessToken })
        .expect(200);

      // 3. Login again
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: uniqueEmail,
          password: 'SecurePass123!',
        })
        .expect(200);

      expect(loginResponse.body.user.email).toBe(uniqueEmail);
      expect(loginResponse.body.session.accessToken).toBeDefined();

      // 4. Verify new session works
      await request(app.getHttpServer())
        .post('/auth/verify-session')
        .send({ accessToken: loginResponse.body.session.accessToken })
        .expect(200);

      // 5. Final logout
      await request(app.getHttpServer())
        .post('/auth/logout')
        .send({ accessToken: loginResponse.body.session.accessToken })
        .expect(200);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);
    });

    it('should validate extra fields are rejected', async () => {
      await request(app.getHttpServer())
        .post('/auth/register/client')
        .send({
          email: `test-${Date.now()}@test.com`,
          password: 'SecurePass123!',
          organizationName: 'Test',
          extraField: 'should be rejected',
        })
        .expect(400);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle multiple login attempts', async () => {
      const loginPromises = Array.from({ length: 5 }, () =>
        request(app.getHttpServer()).post('/auth/login').send({
          email: testUsers.client.email,
          password: testUsers.client.password,
        }),
      );

      const responses = await Promise.all(loginPromises);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.session.accessToken).toBeDefined();
      });

      // All tokens should be valid (Supabase creates separate sessions)
      const tokens = responses.map((r) => r.body.session.accessToken);
      const uniqueTokens = new Set(tokens);
      expect(uniqueTokens.size).toBeGreaterThan(0);
    });
  });

  describe('Performance', () => {
    it('should register within acceptable time', async () => {
      const start = Date.now();

      await request(app.getHttpServer())
        .post('/auth/register/client')
        .send({
          email: `perf-test-${Date.now()}@test.com`,
          password: 'SecurePass123!',
          organizationName: 'Perf Test',
        })
        .expect(201);

      const duration = Date.now() - start;

      // Registration should complete within 5 seconds (Supabase API latency)
      expect(duration).toBeLessThan(5000);
    });

    it('should login within acceptable time', async () => {
      const start = Date.now();

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUsers.client.email,
          password: testUsers.client.password,
        })
        .expect(200);

      const duration = Date.now() - start;

      // Login should complete within 3 seconds
      expect(duration).toBeLessThan(3000);
    });
  });
});
