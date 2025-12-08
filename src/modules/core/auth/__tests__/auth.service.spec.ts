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

describe('AuthService', () => {
  let service: AuthService;
  let supabaseService: jest.Mocked<SupabaseService>;
  let userService: jest.Mocked<UserService>;
  let contextService: jest.Mocked<ContextService>;
  let notificationService: jest.Mocked<NotificationService>;

  // Helper function to create mock Supabase User
  const createMockSupabaseUser = (
    email: string,
    id: string = 'supabase-user-123',
  ): User => ({
    id,
    email,
    email_confirmed_at: new Date().toISOString(),
    user_metadata: { name: 'Test User' },
    app_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    confirmed_at: new Date().toISOString(),
    last_sign_in_at: new Date().toISOString(),
    phone: '',
    role: 'authenticated',
  });

  // Helper function to create mock Session with proper type safety
  const createMockSession = (
    user: User,
    accessToken: string = 'mock-access-token',
    refreshToken: string = 'mock-refresh-token',
  ): Session => ({
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    expires_in: 3600, // ✅ FIXED: Added missing property
    token_type: 'bearer',
    user,
  });

  // Helper function to create mock Database User
  const createMockDbUser = (
    email: string,
    role: 'client' | 'supervisor' | 'student' | 'university' = 'client',
  ) => ({
    id: 'supabase-user-123',
    email, // ✅ FIXED: Now uses the passed email
    name: 'Test User',
    role,
    isActive: true,
    emailVerified: true,
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
            signInWithPassword: jest.fn(),
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

  describe('registerClient', () => {
    const dto = {
      email: 'client@test.com',
      password: 'SecurePass123!',
      organizationName: 'Test Corp',
      industry: 'Technology',
    };

    it('should register new client successfully', async () => {
      // ✅ FIXED: Create mocks with the correct email from dto
      const mockSupabaseUser = createMockSupabaseUser(dto.email);
      const mockSession = createMockSession(mockSupabaseUser);
      const mockDbUser = createMockDbUser(dto.email, 'client');

      userService.findByEmail.mockResolvedValue(null);
      supabaseService.createUser.mockResolvedValue(mockSupabaseUser);
      supabaseService.signInWithPassword.mockResolvedValue({
        user: mockSupabaseUser,
        session: mockSession,
      });
      userService.createClient.mockResolvedValue({
        user: mockDbUser,
        client: mockClient,
      });

      const result = await service.registerClient(dto);

      expect(result.user.email).toBe(dto.email); // ✅ Now passes
      expect(result.user.role).toBe('client');
      expect(result.session.accessToken).toBe(mockSession.access_token);
      expect(result.session.refreshToken).toBe(mockSession.refresh_token);
      expect(result.profile).toMatchObject({
        organizationName: dto.organizationName,
      });

      expect(supabaseService.createUser).toHaveBeenCalledWith(
        dto.email,
        dto.password,
        { name: dto.organizationName },
      );
      expect(supabaseService.signInWithPassword).toHaveBeenCalledWith(
        dto.email,
        dto.password,
      );
      expect(contextService.setMeta).toHaveBeenCalled();
      expect(notificationService.push).toHaveBeenCalledWith({
        type: NotificationType.SUCCESS,
        message: expect.stringContaining('Account created'),
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
    });

    it('should handle Supabase errors', async () => {
      userService.findByEmail.mockResolvedValue(null);
      supabaseService.createUser.mockRejectedValue({
        message: 'User already registered',
      });

      await expect(service.registerClient(dto)).rejects.toThrow(AppError);
    });

    it('should handle session creation failure', async () => {
      const mockSupabaseUser = createMockSupabaseUser(dto.email);

      userService.findByEmail.mockResolvedValue(null);
      supabaseService.createUser.mockResolvedValue(mockSupabaseUser);

      // ✅ FIXED: Mock to return null session (without explicit type assertion)
      supabaseService.signInWithPassword.mockResolvedValue({
        user: mockSupabaseUser,
        session: null as any, // Type assertion needed here due to Supabase types
      });

      // ✅ FIXED: Expect the actual error from handleSupabaseError
      await expect(service.registerClient(dto)).rejects.toThrow(AppError);
      await expect(service.registerClient(dto)).rejects.toMatchObject({
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        message: 'Registration failed',
      });
    });
  });

  describe('registerSupervisor', () => {
    const dto = {
      email: 'supervisor@test.com',
      password: 'SecurePass123!',
      universityId: 'uni-123',
    };

    const mockSupervisor = {
      id: 'supervisor-123',
      userId: 'supabase-user-123',
      universityId: dto.universityId,
      employmentStatus: 'employed' as const,
      employmentDocumentUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should register supervisor successfully', async () => {
      const mockSupabaseUser = createMockSupabaseUser(dto.email);
      const mockSession = createMockSession(mockSupabaseUser);
      const mockDbUser = createMockDbUser(dto.email, 'supervisor');

      userService.findByEmail.mockResolvedValue(null);
      supabaseService.createUser.mockResolvedValue(mockSupabaseUser);
      supabaseService.signInWithPassword.mockResolvedValue({
        user: mockSupabaseUser,
        session: mockSession,
      });
      userService.createSupervisor.mockResolvedValue({
        user: mockDbUser,
        supervisor: mockSupervisor,
      });

      const result = await service.registerSupervisor(dto);

      expect(result.user.role).toBe('supervisor');
      expect(result.profile).toMatchObject({
        universityId: dto.universityId,
      });
    });

    it('should throw error if university not found', async () => {
      const mockSupabaseUser = createMockSupabaseUser(dto.email);
      const mockSession = createMockSession(mockSupabaseUser);

      userService.findByEmail.mockResolvedValue(null);
      supabaseService.createUser.mockResolvedValue(mockSupabaseUser);
      supabaseService.signInWithPassword.mockResolvedValue({
        user: mockSupabaseUser,
        session: mockSession,
      });
      userService.createSupervisor.mockRejectedValue(
        new AppError(ERROR_CODES.RESOURCE_NOT_FOUND, 'University not found'),
      );

      await expect(service.registerSupervisor(dto)).rejects.toThrow(AppError);
    });
  });

  describe('registerStudent', () => {
    const dto = {
      email: 'student@test.com',
      password: 'SecurePass123!',
      matricNumber: 'MAT2021/001',
      skills: ['JavaScript', 'React'],
    };

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

    it('should register student successfully', async () => {
      const mockSupabaseUser = createMockSupabaseUser(dto.email);
      const mockSession = createMockSession(mockSupabaseUser);
      const mockDbUser = createMockDbUser(dto.email, 'student');

      userService.findByEmail.mockResolvedValue(null);
      supabaseService.createUser.mockResolvedValue(mockSupabaseUser);
      supabaseService.signInWithPassword.mockResolvedValue({
        user: mockSupabaseUser,
        session: mockSession,
      });
      userService.createStudent.mockResolvedValue({
        user: mockDbUser,
        student: mockStudent,
      });

      const result = await service.registerStudent(dto);

      expect(result.user.role).toBe('student');
      expect(result.profile).toMatchObject({
        matricNumber: dto.matricNumber,
        skills: dto.skills,
      });
    });
  });

  describe('registerUniversity', () => {
    const dto = {
      email: 'uni@test.com',
      password: 'SecurePass123!',
      name: 'Test University',
      location: 'Lagos',
    };

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

    it('should register university successfully', async () => {
      const mockSupabaseUser = createMockSupabaseUser(dto.email);
      const mockSession = createMockSession(mockSupabaseUser);
      const mockDbUser = createMockDbUser(dto.email, 'university');

      userService.findByEmail.mockResolvedValue(null);
      supabaseService.createUser.mockResolvedValue(mockSupabaseUser);
      supabaseService.signInWithPassword.mockResolvedValue({
        user: mockSupabaseUser,
        session: mockSession,
      });
      userService.createUniversity.mockResolvedValue({
        user: mockDbUser,
        university: mockUniversity,
      });

      const result = await service.registerUniversity(dto);

      expect(result.user.role).toBe('university');
      expect(result.profile).toMatchObject({
        name: dto.name,
        location: dto.location,
      });
    });
  });

  describe('login', () => {
    const dto = {
      email: 'test@test.com',
      password: 'SecurePass123!',
    };

    it('should login successfully', async () => {
      const mockSupabaseUser = createMockSupabaseUser(dto.email);
      const mockSession = createMockSession(mockSupabaseUser);
      const mockDbUser = createMockDbUser(dto.email);

      supabaseService.signInWithPassword.mockResolvedValue({
        user: mockSupabaseUser,
        session: mockSession,
      });
      userService.findById.mockResolvedValue(mockDbUser);
      userService.getUserWithProfile.mockResolvedValue({
        user: mockDbUser,
        profile: mockClient,
      });

      const result = await service.login(dto);

      expect(result.user.email).toBe(dto.email);
      expect(result.session.accessToken).toBe(mockSession.access_token);
      expect(contextService.setMeta).toHaveBeenCalled();
      expect(notificationService.push).toHaveBeenCalledWith({
        type: NotificationType.SUCCESS,
        message: expect.stringContaining('Welcome back'),
        context: expect.any(Object),
      });
    });

    it('should throw error for invalid credentials', async () => {
      supabaseService.signInWithPassword.mockRejectedValue({
        message: 'Invalid login credentials',
      });

      await expect(service.login(dto)).rejects.toThrow(AppError);
      expect(notificationService.push).toHaveBeenCalledWith({
        type: NotificationType.ERROR,
        message: expect.stringContaining('Login failed'),
        context: { email: dto.email },
      });
    });

    it('should throw error if user not found in database', async () => {
      const mockSupabaseUser = createMockSupabaseUser(dto.email);
      const mockSession = createMockSession(mockSupabaseUser);

      supabaseService.signInWithPassword.mockResolvedValue({
        user: mockSupabaseUser,
        session: mockSession,
      });
      userService.findById.mockResolvedValue(null);

      await expect(service.login(dto)).rejects.toThrow(AppError);
      await expect(service.login(dto)).rejects.toMatchObject({
        code: ERROR_CODES.RESOURCE_NOT_FOUND,
      });
    });

    it('should throw error for inactive account', async () => {
      const mockSupabaseUser = createMockSupabaseUser(dto.email);
      const mockSession = createMockSession(mockSupabaseUser);
      const mockDbUser = { ...createMockDbUser(dto.email), isActive: false };

      supabaseService.signInWithPassword.mockResolvedValue({
        user: mockSupabaseUser,
        session: mockSession,
      });
      userService.findById.mockResolvedValue(mockDbUser);

      await expect(service.login(dto)).rejects.toThrow(AppError);
      await expect(service.login(dto)).rejects.toMatchObject({
        code: ERROR_CODES.OPERATION_NOT_ALLOWED,
      });
    });
  });

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
});
