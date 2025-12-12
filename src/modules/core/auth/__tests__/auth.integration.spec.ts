import request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { AuthModule } from '../auth.module';
import { SupabaseService } from '../services/supabase.service';
import { UserService } from '../services/user.service';

describe('AuthModule Integration Tests (OTP Flow)', () => {
  let app: INestApplication;

  const testUser = {
    email: 'test@example.com',
    name: 'Test Org',
    password: 'SecurePass123!',
    organizationName: 'Test Org',
  };
  const validUUID = uuidv4();

  const mockCreateUserResponse = {
    user: {
      id: validUUID,
      email: testUser.email,
      role: 'client',
      email_confirmed_at: null,
      user_metadata: { name: testUser.name },
    },
    session: null,
    error: null,
  };

  const mockVerifyOTPResponse = {
    user: {
      id: validUUID,
      email: testUser.email,
      role: 'client',
      email_confirmed_at: new Date().toISOString(),
    },
    session: {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    },
    error: null,
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AuthModule],
    })
      .overrideProvider(SupabaseService)
      .useValue({
        createUser: jest.fn().mockResolvedValue(mockCreateUserResponse),
        sendOTP: jest
          .fn()
          .mockResolvedValue({ data: { message: 'OTP sent' }, error: null }),
        verifyOTP: jest.fn().mockResolvedValue(mockVerifyOTPResponse),
      })
      .overrideProvider(UserService)
      .useValue({
        createClient: jest.fn().mockResolvedValue({
          id: validUUID,
          email: testUser.email,
          role: 'client',
        }),
        findByEmail: jest.fn().mockResolvedValue(null),
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Auth Flow', () => {
    it('should register → verify OTP → login → verify session', async () => {
      // Register client
      const registerRes = await request(app.getHttpServer() as string)
        .post('/auth/register/client')
        .send(testUser)
        .expect(201);

      expect(registerRes.body).toMatchObject({
        email: testUser.email,
        otpSent: true,
      });

      // Verify OTP
      const verifyRes = await request(app.getHttpServer() as string)
        .post('/auth/verify-otp')
        .send({
          email: testUser.email,
          token: '123456',
        })
        .expect(200);

      expect(verifyRes.body).toHaveProperty('access_token');
      expect(verifyRes.body).toHaveProperty('user');
      expect(verifyRes.body.user.email).toBe(testUser.email);
    });

    it('should reject invalid OTP', async () => {
      const supabaseService = app.get(SupabaseService);
      jest.spyOn(supabaseService, 'verifyOTP').mockResolvedValueOnce({
        user: null,
        session: null,
        error: { message: 'Invalid OTP', status: 401 },
      });

      await request(app.getHttpServer() as string)
        .post('/auth/verify-otp')
        .send({
          email: testUser.email,
          token: 'wrong-otp',
        })
        .expect(401);
    });

    it('should reject login for non-existent user', async () => {
      const userService = app.get(UserService);
      jest.spyOn(userService, 'findByEmail').mockResolvedValueOnce(null);

      await request(app.getHttpServer() as string)
        .post('/auth/login/otp')
        .send({
          email: 'nonexistent@example.com',
          token: '123456',
        })
        .expect(404);
    });
  });
});
