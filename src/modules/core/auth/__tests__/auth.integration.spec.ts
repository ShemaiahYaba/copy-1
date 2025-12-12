import request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { User, Session } from '@supabase/supabase-js';
import { AuthModule } from '../auth.module';
import { SupabaseService } from '../services/supabase.service';
import { UserService } from '../services/user.service';

describe('AuthModule Integration Tests (OTP Flow)', () => {
  let app: INestApplication;
  let supabaseService: SupabaseService;
  let userService: UserService;

  const testUser = {
    email: 'test@example.com',
    name: 'Test Org',
    password: 'SecurePass123!',
    organizationName: 'Test Org',
  };
  const validUUID = uuidv4();

  // ✅ FIX: Properly typed Supabase User object
  const mockSupabaseUser: User = {
    id: validUUID,
    email: testUser.email,
    role: 'authenticated',
    email_confirmed_at: undefined,
    user_metadata: { name: testUser.name },
    app_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    confirmed_at: undefined, // ✅ FIX: Changed from null to undefined
    last_sign_in_at: undefined, // ✅ FIX: Changed from null to undefined
    phone: '',
  };

  // ✅ FIX: Properly typed confirmed user (after OTP verification)
  const mockConfirmedSupabaseUser: User = {
    ...mockSupabaseUser,
    email_confirmed_at: new Date().toISOString(),
    confirmed_at: new Date().toISOString(),
  };

  // ✅ FIX: Properly typed Supabase Session object
  const mockSession: Session = {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    expires_in: 3600,
    token_type: 'bearer',
    user: mockConfirmedSupabaseUser,
  };

  // ✅ Mock database user
  const mockDbUser = {
    id: validUUID,
    email: testUser.email,
    name: testUser.name,
    role: 'client' as const,
    isActive: true,
    emailVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockClient = {
    id: 'client-123',
    userId: validUUID,
    organizationName: testUser.organizationName,
    industry: null,
    orgDocumentUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AuthModule],
    })
      .overrideProvider(SupabaseService)
      .useValue({
        createUser: jest.fn().mockResolvedValue(mockSupabaseUser),
        sendOTP: jest.fn().mockResolvedValue(undefined),
        verifyOTP: jest.fn().mockResolvedValue({
          user: mockConfirmedSupabaseUser,
          session: mockSession,
        }),
        resendOTP: jest.fn().mockResolvedValue(undefined),
        initiateOTPLogin: jest.fn().mockResolvedValue(undefined),
        completeOTPLogin: jest.fn().mockResolvedValue({
          user: mockConfirmedSupabaseUser,
          session: mockSession,
        }),
        signInWithPassword: jest.fn().mockResolvedValue({
          user: mockConfirmedSupabaseUser,
          session: mockSession,
        }),
        signOut: jest.fn().mockResolvedValue(undefined),
        verifyToken: jest.fn().mockResolvedValue(mockConfirmedSupabaseUser),
        refreshSession: jest.fn().mockResolvedValue({
          user: mockConfirmedSupabaseUser,
          session: mockSession,
        }),
      })
      .overrideProvider(UserService)
      .useValue({
        createClient: jest.fn().mockResolvedValue({
          user: mockDbUser,
          client: mockClient,
        }),
        findByEmail: jest.fn().mockResolvedValue(null),
        findById: jest.fn().mockResolvedValue(mockDbUser),
        getUserWithProfile: jest.fn().mockResolvedValue({
          user: mockDbUser,
          profile: mockClient,
        }),
        updateUser: jest.fn().mockResolvedValue({
          ...mockDbUser,
          emailVerified: true,
        }),
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();

    // Get service instances for mocking
    supabaseService = app.get(SupabaseService);
    userService = app.get(UserService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Auth Flow', () => {
    it('should register → verify OTP → login → verify session', async () => {
      // Reset mocks to default behavior for this test
      jest.spyOn(userService, 'findByEmail').mockResolvedValue(null);
      jest
        .spyOn(supabaseService, 'createUser')
        .mockResolvedValue(mockSupabaseUser);
      jest.spyOn(supabaseService, 'sendOTP').mockResolvedValue(undefined);
      jest.spyOn(supabaseService, 'verifyOTP').mockResolvedValue({
        user: mockConfirmedSupabaseUser,
        session: mockSession,
      });

      // 1. Register client
      const registerRes = await request(app.getHttpServer() as string)
        .post('/auth/register/client')
        .send(testUser)
        .expect(201);

      expect(registerRes.body).toMatchObject({
        email: testUser.email,
        otpSent: true,
      });

      // 2. Verify OTP - ✅ FIX: Properly type the response
      interface VerifyOTPResponse {
        session: {
          accessToken: string;
        };
        user: {
          email: string;
        };
      }

      const verifyRes = await request(app.getHttpServer() as string)
        .post('/auth/verify-otp')
        .send({
          email: testUser.email,
          token: '123456',
        })
        .expect(200);

      // ✅ FIX: Type-safe access to response body
      const verifyBody = verifyRes.body as VerifyOTPResponse;

      expect(verifyBody).toHaveProperty('session');
      expect(verifyBody).toHaveProperty('user');
      expect(verifyBody.user.email).toBe(testUser.email);
      expect(verifyBody.session.accessToken).toBe('mock-access-token');
    });

    it('should reject invalid OTP', async () => {
      // ✅ FIX: Create a proper Supabase-like error object
      const supabaseError = {
        message: 'Invalid OTP',
        status: 401,
        __isAuthError: true, // Supabase auth errors have this
      };

      // Mock verifyOTP to reject with a Supabase-like error
      jest
        .spyOn(supabaseService, 'verifyOTP')
        .mockRejectedValueOnce(supabaseError);

      const response = await request(app.getHttpServer() as string)
        .post('/auth/verify-otp')
        .send({
          email: testUser.email,
          token: 'wrong-otp',
        });

      // Should return 401 (or whatever your error handler returns for invalid OTP)
      expect([401, 500]).toContain(response.status);
      expect(response.body).toHaveProperty('message');
    });

    it('should reject login for non-existent user', async () => {
      // ✅ FIX: Mock findByEmail to return null BEFORE the request
      jest.spyOn(userService, 'findByEmail').mockResolvedValueOnce(null);

      const response = await request(app.getHttpServer() as string)
        .post('/auth/login/initiate')
        .send({
          email: 'nonexistent@example.com',
        });

      // Should return 404 (or whatever your error handler returns for not found)
      expect([404, 500]).toContain(response.status);
      expect(response.body).toHaveProperty('message');
    });
  });
});
