// src/modules/core/auth/__tests__/auth.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth.service';
import { SupabaseService } from '../services/supabase.service';
import { UserService } from '../services/user.service';
import { ContextService } from '@shared/context/context.service';
import { NotificationService } from '@shared/notification/notification.service';
import { ERROR_CODES } from '@shared/error/constants/error-codes.constant';
import { AppError } from '@shared/error/classes/app-error.class';
import { NotificationType } from '@shared/notification/interfaces';
import { User, Session } from '@supabase/supabase-js';

describe('AuthService (OTP Flow)', () => {
  let service: AuthService;
  let supabaseService: jest.Mocked<SupabaseService>;
  let userService: jest.Mocked<UserService>;
  let contextService: jest.Mocked<ContextService>;
  let notificationService: jest.Mocked<NotificationService>;

  // Helper function to create mock Supabase User
  const createMockSupabaseUser = (
    email: string,
    id: string = 'supabase-user-123',
    confirmed: boolean = false, // ✅ OTP: Users start unconfirmed
  ): User => ({
    id,
    email,
    email_confirmed_at: confirmed ? new Date().toISOString() : null, // ✅ NULL until OTP verified
    user_metadata: { name: 'Test User' },
    app_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    confirmed_at: confirmed ? new Date().toISOString() : null,
    last_sign_in_at: null,
    phone: '',
    role: 'authenticated',
  });

  // Helper function to create mock Session
  const createMockSession = (
    user: User,
    accessToken: string = 'mock-access-token',
    refreshToken: string = 'mock-refresh-token',
  ): Session => ({
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    expires_in: 3600,
    token_type: 'bearer',
    user,
  });

  // Helper function to create mock Database User
  const createMockDbUser = (
    email: string,
    role: 'client' | 'supervisor' | 'student' | 'university' = 'client',
    emailVerified: boolean = false, // ✅ OTP: Start unverified
  ) => ({
    id: 'supabase-user-123',
    email,
    name: 'Test User',
    role,
    isActive: true,
    emailVerified, // ✅ Added emailVerified field
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const mockClient = {
    id: 'client-123',
    userId: 'supabase-user-123',
    organizationName: 'Test Corp',
    industry: 'Technology',
    orgDocumentUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: SupabaseService,
          useValue: {
            createUser: jest.fn(),
            sendOTP: jest.fn(),
            verifyOTP: jest.fn(),
            resendOTP: jest.fn(),
            initiateOTPLogin: jest.fn(),
            completeOTPLogin: jest.fn(),
            signInWithPassword: jest.fn(), // Legacy - keep for backward compat tests
            signOut: jest.fn(),
            verifyToken: jest.fn(),
            refreshSession: jest.fn(),
          },
        },
        {
          provide: UserService,
          useValue: {
            findByEmail: jest.fn(),
            findById: jest.fn(),
            createClient: jest.fn(),
            createSupervisor: jest.fn(),
            createStudent: jest.fn(),
            createUniversity: jest.fn(),
            getUserWithProfile: jest.fn(),
            updateUser: jest.fn(), // ✅ Added for OTP verification
          },
        },
        {
          provide: ContextService,
          useValue: {
            setMeta: jest.fn(),
          },
        },
        {
          provide: NotificationService,
          useValue: {
            push: jest.fn().mockResolvedValue({}),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    supabaseService = module.get(SupabaseService);
    userService = module.get(UserService);
    contextService = module.get(ContextService);
    notificationService = module.get(NotificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // REGISTRATION TESTS (OTP FLOW)
  // ==========================================================================

  describe('registerClient (OTP Flow)', () => {
    const dto = {
      email: 'client@test.com',
      password: 'SecurePass123!',
      organizationName: 'Test Corp',
      industry: 'Technology',
    };

    it('should create account and send OTP (pending verification)', async () => {
      const mockSupabaseUser = createMockSupabaseUser(
        dto.email,
        'user-123',
        false,
      ); // ✅ Unconfirmed
      const mockDbUser = createMockDbUser(dto.email, 'client', false); // ✅ Unverified

      userService.findByEmail.mockResolvedValue(null);
      supabaseService.createUser.mockResolvedValue(mockSupabaseUser);
      supabaseService.sendOTP.mockResolvedValue(); // ✅ OTP sent
      userService.createClient.mockResolvedValue({
        user: mockDbUser,
        client: mockClient,
      });

      const result = await service.registerClient(dto);

      // ✅ Returns pending response, not full auth response
      expect(result).toMatchObject({
        message: expect.stringContaining('verify your email'),
        email: dto.email,
        userId: mockDbUser.id,
        otpSent: true,
      });

      expect(supabaseService.createUser).toHaveBeenCalledWith(
        dto.email,
        dto.password,
        { name: dto.organizationName },
      );
      expect(supabaseService.sendOTP).toHaveBeenCalledWith(dto.email, 'signup');
      expect(userService.createClient).toHaveBeenCalled();
      expect(notificationService.push).toHaveBeenCalledWith({
        type: NotificationType.INFO, // ✅ INFO not SUCCESS (pending verification)
        message: expect.stringContaining('check your email'),
        context: expect.any(Object),
      });
    });

    it('should throw error if email already exists', async () => {
      const mockDbUser = createMockDbUser(dto.email);
      userService.findByEmail.mockResolvedValue(mockDbUser);

      await expect(service.registerClient(dto)).rejects.toThrow(AppError);
      await expect(service.registerClient(dto)).rejects.toMatchObject({
        code: ERROR_CODES.ALREADY_EXISTS,
      });

      expect(supabaseService.createUser).not.toHaveBeenCalled();
      expect(supabaseService.sendOTP).not.toHaveBeenCalled();
    });

    it('should handle Supabase errors', async () => {
      userService.findByEmail.mockResolvedValue(null);
      supabaseService.createUser.mockRejectedValue({
        message: 'User already registered',
      });

      await expect(service.registerClient(dto)).rejects.toThrow(AppError);
    });

    it('should handle OTP sending failure', async () => {
      const mockSupabaseUser = createMockSupabaseUser(dto.email);

      userService.findByEmail.mockResolvedValue(null);
      supabaseService.createUser.mockResolvedValue(mockSupabaseUser);
      supabaseService.sendOTP.mockRejectedValue(
        new Error('Failed to send email'),
      );

      await expect(service.registerClient(dto)).rejects.toThrow(AppError);
    });
  });

  describe('verifyRegistrationOTP', () => {
    const dto = {
      email: 'client@test.com',
      token: '123456',
    };

    it('should verify OTP and complete registration', async () => {
      const mockSupabaseUser = createMockSupabaseUser(
        dto.email,
        'user-123',
        true,
      ); // ✅ Now confirmed
      const mockSession = createMockSession(mockSupabaseUser);
      const mockDbUser = createMockDbUser(dto.email, 'client', false); // ✅ Still unverified in DB
      const updatedDbUser = { ...mockDbUser, emailVerified: true }; // ✅ Will be updated

      supabaseService.verifyOTP.mockResolvedValue({
        user: mockSupabaseUser,
        session: mockSession,
      });
      userService.findById.mockResolvedValue(mockDbUser);
      userService.updateUser.mockResolvedValue(updatedDbUser); // ✅ Update user
      userService.getUserWithProfile.mockResolvedValue({
        user: updatedDbUser,
        profile: mockClient,
      });

      const result = await service.verifyRegistrationOTP(dto);

      expect(result.user.email).toBe(dto.email);
      expect(result.session.accessToken).toBe(mockSession.access_token);
      expect(result.profile).toMatchObject({
        organizationName: mockClient.organizationName,
      });

      expect(supabaseService.verifyOTP).toHaveBeenCalledWith(
        dto.email,
        dto.token,
      );
      expect(userService.updateUser).toHaveBeenCalledWith(mockDbUser.id, {
        emailVerified: true,
      });
      expect(contextService.setMeta).toHaveBeenCalled();
      expect(notificationService.push).toHaveBeenCalledWith({
        type: NotificationType.SUCCESS,
        message: expect.stringContaining('verified successfully'),
        context: expect.any(Object),
      });
    });

    it('should throw error for invalid OTP', async () => {
      supabaseService.verifyOTP.mockRejectedValue({
        message: 'Invalid OTP',
      });

      await expect(service.verifyRegistrationOTP(dto)).rejects.toThrow(
        AppError,
      );
      await expect(service.verifyRegistrationOTP(dto)).rejects.toMatchObject({
        message: expect.stringContaining('Invalid or expired OTP'),
      });
    });

    it('should throw error for expired OTP', async () => {
      supabaseService.verifyOTP.mockRejectedValue({
        message: 'Token expired',
      });

      await expect(service.verifyRegistrationOTP(dto)).rejects.toThrow(
        AppError,
      );
    });

    it('should throw error if user not found', async () => {
      const mockSupabaseUser = createMockSupabaseUser(
        dto.email,
        'user-123',
        true,
      );
      const mockSession = createMockSession(mockSupabaseUser);

      supabaseService.verifyOTP.mockResolvedValue({
        user: mockSupabaseUser,
        session: mockSession,
      });
      userService.findById.mockResolvedValue(null);

      await expect(service.verifyRegistrationOTP(dto)).rejects.toThrow(
        AppError,
      );
      await expect(service.verifyRegistrationOTP(dto)).rejects.toMatchObject({
        code: ERROR_CODES.RESOURCE_NOT_FOUND,
      });
    });

    it('should throw error if session not created', async () => {
      const mockSupabaseUser = createMockSupabaseUser(dto.email);

      supabaseService.verifyOTP.mockResolvedValue({
        user: mockSupabaseUser,
        session: null as any, // ✅ Session creation failed
      });

      await expect(service.verifyRegistrationOTP(dto)).rejects.toThrow(
        AppError,
      );
    });
  });

  describe('registerSupervisor (OTP Flow)', () => {
    const dto = {
      email: 'supervisor@test.com',
      password: 'SecurePass123!',
      universityId: 'uni-123',
    };

    it('should register supervisor and send OTP', async () => {
      const mockSupabaseUser = createMockSupabaseUser(dto.email);
      const mockDbUser = createMockDbUser(dto.email, 'supervisor', false);
      const mockSupervisor = {
        id: 'supervisor-123',
        userId: 'supabase-user-123',
        universityId: dto.universityId,
        employmentStatus: 'employed' as const,
        employmentDocumentUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      userService.findByEmail.mockResolvedValue(null);
      supabaseService.createUser.mockResolvedValue(mockSupabaseUser);
      supabaseService.sendOTP.mockResolvedValue();
      userService.createSupervisor.mockResolvedValue({
        user: mockDbUser,
        supervisor: mockSupervisor,
      });

      const result = await service.registerSupervisor(dto);

      expect(result).toMatchObject({
        message: expect.stringContaining('verify your email'),
        email: dto.email,
        otpSent: true,
      });
    });
  });

  describe('registerStudent (OTP Flow)', () => {
    const dto = {
      email: 'student@test.com',
      password: 'SecurePass123!',
      matricNumber: 'MAT2021/001',
      skills: ['JavaScript', 'React'],
    };

    it('should register student and send OTP', async () => {
      const mockSupabaseUser = createMockSupabaseUser(dto.email);
      const mockDbUser = createMockDbUser(dto.email, 'student', false);
      const mockStudent = {
        id: 'student-123',
        userId: 'supabase-user-123',
        matricNumber: dto.matricNumber,
        graduationStatus: 'active' as const,
        supervisorId: null,
        skills: dto.skills,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      userService.findByEmail.mockResolvedValue(null);
      supabaseService.createUser.mockResolvedValue(mockSupabaseUser);
      supabaseService.sendOTP.mockResolvedValue();
      userService.createStudent.mockResolvedValue({
        user: mockDbUser,
        student: mockStudent,
      });

      const result = await service.registerStudent(dto);

      expect(result).toMatchObject({
        message: expect.stringContaining('verify your email'),
        email: dto.email,
        otpSent: true,
      });
    });
  });

  describe('registerUniversity (OTP Flow)', () => {
    const dto = {
      email: 'uni@test.com',
      password: 'SecurePass123!',
      name: 'Test University',
      location: 'Lagos',
    };

    it('should register university and send OTP', async () => {
      const mockSupabaseUser = createMockSupabaseUser(dto.email);
      const mockDbUser = createMockDbUser(dto.email, 'university', false);
      const mockUniversity = {
        id: 'uni-123',
        userId: 'supabase-user-123',
        name: dto.name,
        location: dto.location,
        verificationDocumentUrl: null,
        isVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      userService.findByEmail.mockResolvedValue(null);
      supabaseService.createUser.mockResolvedValue(mockSupabaseUser);
      supabaseService.sendOTP.mockResolvedValue();
      userService.createUniversity.mockResolvedValue({
        user: mockDbUser,
        university: mockUniversity,
      });

      const result = await service.registerUniversity(dto);

      expect(result).toMatchObject({
        message: expect.stringContaining('verify your email'),
        email: dto.email,
        otpSent: true,
      });
    });
  });

  // ==========================================================================
  // LOGIN TESTS (OTP FLOW)
  // ==========================================================================

  describe('initiateOTPLogin', () => {
    const dto = {
      email: 'test@test.com',
    };

    it('should send OTP for valid user', async () => {
      const mockDbUser = createMockDbUser(dto.email, 'client', true);

      userService.findByEmail.mockResolvedValue(mockDbUser);
      supabaseService.initiateOTPLogin.mockResolvedValue();

      const result = await service.initiateOTPLogin(dto);

      expect(result).toMatchObject({
        message: expect.stringContaining('OTP sent'),
        email: dto.email,
        expiresIn: 600,
      });

      expect(supabaseService.initiateOTPLogin).toHaveBeenCalledWith(dto.email);
      expect(notificationService.push).toHaveBeenCalledWith({
        type: NotificationType.INFO,
        message: expect.stringContaining('OTP sent'),
        context: { email: dto.email },
      });
    });

    it('should throw error if user not found', async () => {
      userService.findByEmail.mockResolvedValue(null);

      await expect(service.initiateOTPLogin(dto)).rejects.toThrow(AppError);
      await expect(service.initiateOTPLogin(dto)).rejects.toMatchObject({
        code: ERROR_CODES.RESOURCE_NOT_FOUND,
      });

      expect(supabaseService.initiateOTPLogin).not.toHaveBeenCalled();
    });

    it('should throw error if account is inactive', async () => {
      const mockDbUser = { ...createMockDbUser(dto.email), isActive: false };

      userService.findByEmail.mockResolvedValue(mockDbUser);

      await expect(service.initiateOTPLogin(dto)).rejects.toThrow(AppError);
      await expect(service.initiateOTPLogin(dto)).rejects.toMatchObject({
        code: ERROR_CODES.OPERATION_NOT_ALLOWED,
      });
    });

    it('should handle Supabase OTP sending errors', async () => {
      const mockDbUser = createMockDbUser(dto.email);

      userService.findByEmail.mockResolvedValue(mockDbUser);
      supabaseService.initiateOTPLogin.mockRejectedValue(
        new Error('Failed to send OTP'),
      );

      await expect(service.initiateOTPLogin(dto)).rejects.toThrow(AppError);
    });
  });

  describe('verifyLoginOTP', () => {
    const dto = {
      email: 'test@test.com',
      token: '123456',
    };

    it('should login successfully with valid OTP', async () => {
      const mockSupabaseUser = createMockSupabaseUser(
        dto.email,
        'user-123',
        true,
      );
      const mockSession = createMockSession(mockSupabaseUser);
      const mockDbUser = createMockDbUser(dto.email, 'client', true);

      supabaseService.completeOTPLogin.mockResolvedValue({
        user: mockSupabaseUser,
        session: mockSession,
      });
      userService.findById.mockResolvedValue(mockDbUser);
      userService.getUserWithProfile.mockResolvedValue({
        user: mockDbUser,
        profile: mockClient,
      });

      const result = await service.verifyLoginOTP(dto);

      expect(result.user.email).toBe(dto.email);
      expect(result.session.accessToken).toBe(mockSession.access_token);
      expect(contextService.setMeta).toHaveBeenCalled();
      expect(notificationService.push).toHaveBeenCalledWith({
        type: NotificationType.SUCCESS,
        message: expect.stringContaining('Welcome back'),
        context: expect.any(Object),
      });
    });

    it('should throw error for invalid OTP', async () => {
      supabaseService.completeOTPLogin.mockRejectedValue({
        message: 'Invalid OTP',
      });

      await expect(service.verifyLoginOTP(dto)).rejects.toThrow(AppError);
      expect(notificationService.push).toHaveBeenCalledWith({
        type: NotificationType.ERROR,
        message: expect.stringContaining('Login failed'),
        context: { email: dto.email },
      });
    });

    it('should throw error if user not found in database', async () => {
      const mockSupabaseUser = createMockSupabaseUser(dto.email);
      const mockSession = createMockSession(mockSupabaseUser);

      supabaseService.completeOTPLogin.mockResolvedValue({
        user: mockSupabaseUser,
        session: mockSession,
      });
      userService.findById.mockResolvedValue(null);

      await expect(service.verifyLoginOTP(dto)).rejects.toThrow(AppError);
      await expect(service.verifyLoginOTP(dto)).rejects.toMatchObject({
        code: ERROR_CODES.RESOURCE_NOT_FOUND,
      });
    });

    it('should throw error for inactive account', async () => {
      const mockSupabaseUser = createMockSupabaseUser(dto.email);
      const mockSession = createMockSession(mockSupabaseUser);
      const mockDbUser = { ...createMockDbUser(dto.email), isActive: false };

      supabaseService.completeOTPLogin.mockResolvedValue({
        user: mockSupabaseUser,
        session: mockSession,
      });
      userService.findById.mockResolvedValue(mockDbUser);

      await expect(service.verifyLoginOTP(dto)).rejects.toThrow(AppError);
      await expect(service.verifyLoginOTP(dto)).rejects.toMatchObject({
        code: ERROR_CODES.OPERATION_NOT_ALLOWED,
      });
    });
  });

  describe('resendOTP', () => {
    const dto = {
      email: 'test@test.com',
    };

    it('should resend OTP successfully', async () => {
      supabaseService.resendOTP.mockResolvedValue();

      const result = await service.resendOTP(dto);

      expect(result).toMatchObject({
        message: expect.stringContaining('OTP sent'),
        email: dto.email,
        expiresIn: 600,
      });

      expect(supabaseService.resendOTP).toHaveBeenCalledWith(dto.email);
      expect(notificationService.push).toHaveBeenCalledWith({
        type: NotificationType.INFO,
        message: expect.stringContaining('New OTP sent'),
        context: { email: dto.email },
      });
    });

    it('should handle resend errors', async () => {
      supabaseService.resendOTP.mockRejectedValue(
        new Error('Failed to resend'),
      );

      await expect(service.resendOTP(dto)).rejects.toThrow(AppError);
      await expect(service.resendOTP(dto)).rejects.toMatchObject({
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      });
    });
  });

  // ==========================================================================
  // OTHER AUTH METHODS (Unchanged)
  // ==========================================================================

  describe('logout', () => {
    it('should logout successfully', async () => {
      const accessToken = 'mock-access-token';
      const userId = 'user-123';

      supabaseService.signOut.mockResolvedValue();

      await service.logout(accessToken, userId);

      expect(supabaseService.signOut).toHaveBeenCalledWith(accessToken);
      expect(notificationService.push).toHaveBeenCalledWith({
        type: NotificationType.INFO,
        message: expect.stringContaining('logged out'),
        context: { userId },
      });
    });

    it('should handle logout errors', async () => {
      const accessToken = 'mock-access-token';
      supabaseService.signOut.mockRejectedValue(new Error('Logout failed'));

      await expect(service.logout(accessToken)).rejects.toThrow(AppError);
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      const refreshToken = 'mock-refresh-token';
      const mockSupabaseUser = createMockSupabaseUser('test@test.com');
      const newSession = createMockSession(
        mockSupabaseUser,
        'new-access-token',
        refreshToken,
      );

      supabaseService.refreshSession.mockResolvedValue({
        user: mockSupabaseUser,
        session: newSession,
      });

      const result = await service.refreshToken(refreshToken);

      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe(newSession.refresh_token);
    });

    it('should throw error for invalid refresh token', async () => {
      supabaseService.refreshSession.mockRejectedValue(
        new Error('Invalid refresh token'),
      );

      await expect(service.refreshToken('invalid')).rejects.toThrow(AppError);
    });
  });

  describe('verifySession', () => {
    it('should verify session successfully', async () => {
      const accessToken = 'mock-access-token';
      const mockSupabaseUser = createMockSupabaseUser('test@test.com');
      const mockDbUser = createMockDbUser('test@test.com');

      supabaseService.verifyToken.mockResolvedValue(mockSupabaseUser);
      userService.findById.mockResolvedValue(mockDbUser);
      userService.getUserWithProfile.mockResolvedValue({
        user: mockDbUser,
        profile: mockClient,
      });

      const result = await service.verifySession(accessToken);

      expect(result.user.id).toBe(mockDbUser.id);
      expect(result.profile).toBeDefined();
    });

    it('should throw error for invalid token', async () => {
      supabaseService.verifyToken.mockRejectedValue(new Error('Invalid token'));

      await expect(service.verifySession('invalid')).rejects.toThrow(AppError);
    });

    it('should throw error if user not found', async () => {
      const mockSupabaseUser = createMockSupabaseUser('test@test.com');

      supabaseService.verifyToken.mockResolvedValue(mockSupabaseUser);
      userService.findById.mockResolvedValue(null);

      await expect(service.verifySession('token')).rejects.toThrow(AppError);
    });
  });

  // ==========================================================================
  // COMPLETE FLOW TESTS
  // ==========================================================================

  describe('Complete Registration Flow', () => {
    it('should complete full registration: register → verify OTP → login', async () => {
      const email = 'complete@test.com';
      const password = 'SecurePass123!';
      const otp = '123456';

      // Step 1: Register
      const mockSupabaseUser = createMockSupabaseUser(email, 'user-123', false);
      const mockDbUser = createMockDbUser(email, 'client', false);

      userService.findByEmail.mockResolvedValue(null);
      supabaseService.createUser.mockResolvedValue(mockSupabaseUser);
      supabaseService.sendOTP.mockResolvedValue();
      userService.createClient.mockResolvedValue({
        user: mockDbUser,
        client: mockClient,
      });

      const registrationResult = await service.registerClient({
        email,
        password,
        organizationName: 'Test Corp',
      });

      expect(registrationResult.otpSent).toBe(true);

      // Step 2: Verify OTP
      const confirmedUser = createMockSupabaseUser(email, 'user-123', true);
      const session = createMockSession(confirmedUser);

      supabaseService.verifyOTP.mockResolvedValue({
        user: confirmedUser,
        session,
      });
      userService.findById.mockResolvedValue(mockDbUser);
      userService.updateUser.mockResolvedValue({
        ...mockDbUser,
        emailVerified: true,
      });
      userService.getUserWithProfile.mockResolvedValue({
        user: { ...mockDbUser, emailVerified: true },
        profile: mockClient,
      });

      const verificationResult = await service.verifyRegistrationOTP({
        email,
        token: otp,
      });

      expect(verificationResult.session).toBeDefined();
      expect(verificationResult.user.email).toBe(email);
    });
  });

  describe('Complete Login Flow', () => {
    it('should complete full login: initiate → verify OTP', async () => {
      const email = 'login@test.com';
      const otp = '654321';

      // Step 1: Initiate login
      const mockDbUser = createMockDbUser(email, 'client', true);

      userService.findByEmail.mockResolvedValue(mockDbUser);
      supabaseService.initiateOTPLogin.mockResolvedValue();

      const initiateResult = await service.initiateOTPLogin({ email });

      expect(initiateResult.email).toBe(email);

      // Step 2: Verify OTP
      const mockSupabaseUser = createMockSupabaseUser(email);
      const mockSession = createMockSession(mockSupabaseUser);

      supabaseService.completeOTPLogin.mockResolvedValue({
        user: mockSupabaseUser,
        session: mockSession,
      });
      userService.findById.mockResolvedValue(mockDbUser);
      userService.getUserWithProfile.mockResolvedValue({
        user: mockDbUser,
        profile: mockClient,
      });

      const loginResult = await service.verifyLoginOTP({ email, token: otp });

      expect(loginResult.session).toBeDefined();
      expect(loginResult.user.email).toBe(email);
    });
  });
});
