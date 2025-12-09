// src/modules/core/auth/__tests__/supabase.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { SupabaseService } from '../services/supabase.service';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

// ============================================================================
// MOCK SETUP
// ============================================================================

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

const mockCreateClient = createClient as jest.MockedFunction<
  typeof createClient
>;

// ============================================================================
// MOCK FACTORIES
// ============================================================================

/**
 * Factory to create a mock Supabase User
 */
const createMockUser = (overrides?: Partial<User>): User => ({
  id: 'test-user-id',
  email: 'test@example.com',
  user_metadata: { name: 'Test User' },
  app_metadata: {},
  aud: 'authenticated',
  confirmed_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  email_confirmed_at: new Date().toISOString(),
  last_sign_in_at: new Date().toISOString(),
  phone: '',
  role: 'authenticated',
  updated_at: new Date().toISOString(),
  ...overrides,
});

/**
 * Factory to create a mock Supabase success response
 */
const createSuccessResponse = <T>(data: T) => ({
  data,
  error: null,
});

/**
 * Factory to create a mock Supabase error response
 */
const createErrorResponse = (message: string, code = '400') => ({
  data: { user: null },
  error: { message, code },
});

/**
 * Factory to create a mock Supabase session
 */
const createMockSession = (user: User, overrides?: any) => ({
  access_token: 'test-access-token',
  refresh_token: 'test-refresh-token',
  user,
  ...overrides,
});

/**
 * Factory to create a complete mock Supabase client
 */
const createMockSupabaseClient = (): jest.Mocked<
  SupabaseClient<any, any, any, any>
> =>
  ({
    auth: {
      admin: {
        createUser: jest.fn(),
        deleteUser: jest.fn(),
        updateUserById: jest.fn(),
      },
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      getUser: jest.fn(),
      refreshSession: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      resend: jest.fn(),
    },
  }) as jest.Mocked<SupabaseClient<any, any, any, any>>;

/**
 * Setup test environment with standard configuration
 */
const setupTestEnvironment = () => {
  process.env.SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
  process.env.SUPABASE_ANON_KEY = 'test-anon-key';
  process.env.FRONTEND_URL = 'https://test-frontend.com';
};

// ============================================================================
// TEST SUITE
// ============================================================================

describe('SupabaseService', () => {
  let service: SupabaseService;
  let mockSupabaseClient: jest.Mocked<SupabaseClient<any, any, any, any>>;
  let mockUser: User;

  // Test data constants
  const TEST_USER_ID = 'test-user-id';
  const TEST_EMAIL = 'test@example.com';
  const TEST_PASSWORD = 'test-password';
  const TEST_ACCESS_TOKEN = 'test-access-token';
  const TEST_REFRESH_TOKEN = 'test-refresh-token';

  beforeEach(async () => {
    // Setup environment
    setupTestEnvironment();

    // Create mock objects
    mockUser = createMockUser();
    mockSupabaseClient = createMockSupabaseClient();

    // Mock the createClient function
    mockCreateClient.mockReturnValue(mockSupabaseClient);

    // Create testing module
    const module: TestingModule = await Test.createTestingModule({
      providers: [SupabaseService],
    }).compile();

    service = module.get<SupabaseService>(SupabaseService);
    service.onModuleInit();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // INITIALIZATION TESTS
  // ==========================================================================

  describe('Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have a Supabase client', () => {
      expect(service.getClient()).toBeDefined();
      expect(service.getClient()).toBe(mockSupabaseClient);
    });

    it('should throw error if SUPABASE_URL is not set', () => {
      delete process.env.SUPABASE_URL;
      expect(() => service.onModuleInit()).toThrow(
        'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment variables',
      );
    });

    it('should throw error if SUPABASE_SERVICE_ROLE_KEY is not set', () => {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      expect(() => service.onModuleInit()).toThrow(
        'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment variables',
      );
    });

    it('should initialize Supabase client with correct configuration', () => {
      expect(mockCreateClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-service-key',
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        },
      );
    });
  });

  // ==========================================================================
  // CREATE USER TESTS
  // ==========================================================================

  describe('createUser', () => {
    it('should create a user successfully', async () => {
      const mockResponse = createSuccessResponse({ user: mockUser });
      mockSupabaseClient.auth.admin.createUser.mockResolvedValue(mockResponse);

      const result = await service.createUser(TEST_EMAIL, TEST_PASSWORD, {
        name: 'Test User',
      });

      expect(mockSupabaseClient.auth.admin.createUser).toHaveBeenCalledWith({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        user_metadata: { name: 'Test User' },
      });
      expect(result).toEqual(mockUser);
    });

    it('should create a user with empty metadata when not provided', async () => {
      const mockResponse = createSuccessResponse({ user: mockUser });
      mockSupabaseClient.auth.admin.createUser.mockResolvedValue(mockResponse);

      await service.createUser(TEST_EMAIL, TEST_PASSWORD);

      expect(mockSupabaseClient.auth.admin.createUser).toHaveBeenCalledWith({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        user_metadata: {},
      });
    });

    it('should throw error when user creation fails', async () => {
      const mockResponse = createErrorResponse('User creation failed');
      mockSupabaseClient.auth.admin.createUser.mockResolvedValue(mockResponse);

      await expect(
        service.createUser(TEST_EMAIL, TEST_PASSWORD),
      ).rejects.toEqual(mockResponse.error);
    });

    it('should log error when user creation fails', async () => {
      const mockResponse = createErrorResponse('User creation failed');
      mockSupabaseClient.auth.admin.createUser.mockResolvedValue(mockResponse);

      const loggerSpy = jest.spyOn(Logger.prototype, 'error');

      try {
        await service.createUser(TEST_EMAIL, TEST_PASSWORD);
      } catch (error) {
        // Expected
      }

      expect(loggerSpy).toHaveBeenCalledWith(
        'Failed to create user:',
        mockResponse.error,
      );
    });
  });

  // ==========================================================================
  // DELETE USER TESTS
  // ==========================================================================

  describe('deleteUser', () => {
    it('should delete a user successfully', async () => {
      const mockResponse = createSuccessResponse({});
      mockSupabaseClient.auth.admin.deleteUser.mockResolvedValue(mockResponse);

      await service.deleteUser(TEST_USER_ID);

      expect(mockSupabaseClient.auth.admin.deleteUser).toHaveBeenCalledWith(
        TEST_USER_ID,
      );
    });

    it('should throw error when user deletion fails', async () => {
      const mockResponse = createErrorResponse('User deletion failed');
      mockSupabaseClient.auth.admin.deleteUser.mockResolvedValue(mockResponse);

      await expect(service.deleteUser(TEST_USER_ID)).rejects.toEqual(
        mockResponse.error,
      );
    });

    it('should log error when user deletion fails', async () => {
      const mockResponse = createErrorResponse('User deletion failed');
      mockSupabaseClient.auth.admin.deleteUser.mockResolvedValue(mockResponse);

      const loggerSpy = jest.spyOn(Logger.prototype, 'error');

      try {
        await service.deleteUser(TEST_USER_ID);
      } catch (error) {
        // Expected
      }

      expect(loggerSpy).toHaveBeenCalledWith(
        'Failed to delete user:',
        mockResponse.error,
      );
    });
  });

  // ==========================================================================
  // SIGN IN TESTS
  // ==========================================================================

  describe('signInWithPassword', () => {
    it('should sign in with password successfully', async () => {
      const mockSession = createMockSession(mockUser);
      const mockResponse = createSuccessResponse({
        user: mockUser,
        session: mockSession,
      });
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue(
        mockResponse,
      );

      const result = await service.signInWithPassword(
        TEST_EMAIL,
        TEST_PASSWORD,
      );

      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should throw error when sign in fails', async () => {
      const mockResponse = createErrorResponse('Sign in failed');
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: mockResponse.error,
      });

      await expect(
        service.signInWithPassword(TEST_EMAIL, TEST_PASSWORD),
      ).rejects.toEqual(mockResponse.error);
    });

    it('should log error when sign in fails', async () => {
      const mockResponse = createErrorResponse('Sign in failed');
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: mockResponse.error,
      });

      const loggerSpy = jest.spyOn(Logger.prototype, 'error');

      try {
        await service.signInWithPassword(TEST_EMAIL, TEST_PASSWORD);
      } catch (error) {
        // Expected
      }

      expect(loggerSpy).toHaveBeenCalledWith(
        'Sign in failed:',
        mockResponse.error,
      );
    });
  });

  // ==========================================================================
  // SIGN OUT TESTS
  // ==========================================================================

  describe('signOut', () => {
    it('should sign out user successfully', async () => {
      const mockResponse = createSuccessResponse({});
      const mockUserClient = createMockSupabaseClient();
      mockUserClient.auth.signOut.mockResolvedValue(mockResponse);
      mockCreateClient.mockReturnValue(mockUserClient);

      await service.signOut(TEST_ACCESS_TOKEN);

      expect(mockCreateClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-anon-key',
        {
          global: {
            headers: {
              Authorization: `Bearer ${TEST_ACCESS_TOKEN}`,
            },
          },
        },
      );
      expect(mockUserClient.auth.signOut).toHaveBeenCalled();
    });

    it('should throw error when sign out fails', async () => {
      const mockResponse = createErrorResponse('Sign out failed');
      const mockUserClient = createMockSupabaseClient();
      mockUserClient.auth.signOut.mockResolvedValue(mockResponse);
      mockCreateClient.mockReturnValue(mockUserClient);

      await expect(service.signOut(TEST_ACCESS_TOKEN)).rejects.toEqual(
        mockResponse.error,
      );
    });

    it('should log error when sign out fails', async () => {
      const mockResponse = createErrorResponse('Sign out failed');
      const mockUserClient = createMockSupabaseClient();
      mockUserClient.auth.signOut.mockResolvedValue(mockResponse);
      mockCreateClient.mockReturnValue(mockUserClient);

      const loggerSpy = jest.spyOn(Logger.prototype, 'error');

      try {
        await service.signOut(TEST_ACCESS_TOKEN);
      } catch (error) {
        // Expected
      }

      expect(loggerSpy).toHaveBeenCalledWith(
        'Sign out failed:',
        mockResponse.error,
      );
    });
  });

  // ==========================================================================
  // VERIFY TOKEN TESTS
  // ==========================================================================

  describe('verifyToken', () => {
    it('should verify token and return user successfully', async () => {
      const mockResponse = createSuccessResponse({ user: mockUser });
      mockSupabaseClient.auth.getUser.mockResolvedValue(mockResponse);

      const result = await service.verifyToken(TEST_ACCESS_TOKEN);

      expect(mockSupabaseClient.auth.getUser).toHaveBeenCalledWith(
        TEST_ACCESS_TOKEN,
      );
      expect(result).toEqual(mockUser);
    });

    it('should throw error when token verification fails', async () => {
      const mockResponse = createErrorResponse('Token verification failed');
      mockSupabaseClient.auth.getUser.mockResolvedValue(mockResponse);

      await expect(service.verifyToken(TEST_ACCESS_TOKEN)).rejects.toEqual(
        mockResponse.error,
      );
    });

    it('should throw error when user not found', async () => {
      const mockResponse = createSuccessResponse({ user: null });
      mockSupabaseClient.auth.getUser.mockResolvedValue(mockResponse);

      await expect(service.verifyToken(TEST_ACCESS_TOKEN)).rejects.toEqual(
        new Error('User not found'),
      );
    });

    it('should log error when token verification fails', async () => {
      const mockResponse = createErrorResponse('Token verification failed');
      mockSupabaseClient.auth.getUser.mockResolvedValue(mockResponse);

      const loggerSpy = jest.spyOn(Logger.prototype, 'error');

      try {
        await service.verifyToken(TEST_ACCESS_TOKEN);
      } catch (error) {
        // Expected
      }

      expect(loggerSpy).toHaveBeenCalledWith(
        'Token verification failed:',
        mockResponse.error,
      );
    });
  });

  // ==========================================================================
  // REFRESH SESSION TESTS
  // ==========================================================================

  describe('refreshSession', () => {
    it('should refresh session successfully', async () => {
      const mockSession = createMockSession(mockUser, {
        access_token: 'new-access-token',
      });
      const mockResponse = createSuccessResponse({
        user: mockUser,
        session: mockSession,
      });
      mockSupabaseClient.auth.refreshSession.mockResolvedValue(mockResponse);

      const result = await service.refreshSession(TEST_REFRESH_TOKEN);

      expect(mockSupabaseClient.auth.refreshSession).toHaveBeenCalledWith({
        refresh_token: TEST_REFRESH_TOKEN,
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should throw error when session refresh fails', async () => {
      const mockResponse = createErrorResponse('Session refresh failed');
      mockSupabaseClient.auth.refreshSession.mockResolvedValue({
        data: { user: null, session: null },
        error: mockResponse.error,
      });

      await expect(service.refreshSession(TEST_REFRESH_TOKEN)).rejects.toEqual(
        mockResponse.error,
      );
    });

    it('should log error when session refresh fails', async () => {
      const mockResponse = createErrorResponse('Session refresh failed');
      mockSupabaseClient.auth.refreshSession.mockResolvedValue({
        data: { user: null, session: null },
        error: mockResponse.error,
      });

      const loggerSpy = jest.spyOn(Logger.prototype, 'error');

      try {
        await service.refreshSession(TEST_REFRESH_TOKEN);
      } catch (error) {
        // Expected
      }

      expect(loggerSpy).toHaveBeenCalledWith(
        'Session refresh failed:',
        mockResponse.error,
      );
    });
  });

  // ==========================================================================
  // UPDATE USER EMAIL TESTS
  // ==========================================================================

  describe('updateUserEmail', () => {
    const NEW_EMAIL = 'new@example.com';

    it('should update user email successfully', async () => {
      const mockResponse = createSuccessResponse({ user: mockUser });
      mockSupabaseClient.auth.admin.updateUserById.mockResolvedValue(
        mockResponse,
      );

      const result = await service.updateUserEmail(TEST_USER_ID, NEW_EMAIL);

      expect(mockSupabaseClient.auth.admin.updateUserById).toHaveBeenCalledWith(
        TEST_USER_ID,
        { email: NEW_EMAIL },
      );
      expect(result).toEqual(mockUser);
    });

    it('should throw error when email update fails', async () => {
      const mockResponse = createErrorResponse('Email update failed');
      mockSupabaseClient.auth.admin.updateUserById.mockResolvedValue(
        mockResponse,
      );

      await expect(
        service.updateUserEmail(TEST_USER_ID, NEW_EMAIL),
      ).rejects.toEqual(mockResponse.error);
    });

    it('should log error when email update fails', async () => {
      const mockResponse = createErrorResponse('Email update failed');
      mockSupabaseClient.auth.admin.updateUserById.mockResolvedValue(
        mockResponse,
      );

      const loggerSpy = jest.spyOn(Logger.prototype, 'error');

      try {
        await service.updateUserEmail(TEST_USER_ID, NEW_EMAIL);
      } catch (error) {
        // Expected
      }

      expect(loggerSpy).toHaveBeenCalledWith(
        'Failed to update email:',
        mockResponse.error,
      );
    });
  });

  // ==========================================================================
  // UPDATE USER PASSWORD TESTS
  // ==========================================================================

  describe('updateUserPassword', () => {
    const NEW_PASSWORD = 'new-password';

    it('should update user password successfully', async () => {
      const mockResponse = createSuccessResponse({ user: mockUser });
      mockSupabaseClient.auth.admin.updateUserById.mockResolvedValue(
        mockResponse,
      );

      const result = await service.updateUserPassword(
        TEST_USER_ID,
        NEW_PASSWORD,
      );

      expect(mockSupabaseClient.auth.admin.updateUserById).toHaveBeenCalledWith(
        TEST_USER_ID,
        { password: NEW_PASSWORD },
      );
      expect(result).toEqual(mockUser);
    });

    it('should throw error when password update fails', async () => {
      const mockResponse = createErrorResponse('Password update failed');
      mockSupabaseClient.auth.admin.updateUserById.mockResolvedValue(
        mockResponse,
      );

      await expect(
        service.updateUserPassword(TEST_USER_ID, NEW_PASSWORD),
      ).rejects.toEqual(mockResponse.error);
    });

    it('should log error when password update fails', async () => {
      const mockResponse = createErrorResponse('Password update failed');
      mockSupabaseClient.auth.admin.updateUserById.mockResolvedValue(
        mockResponse,
      );

      const loggerSpy = jest.spyOn(Logger.prototype, 'error');

      try {
        await service.updateUserPassword(TEST_USER_ID, NEW_PASSWORD);
      } catch (error) {
        // Expected
      }

      expect(loggerSpy).toHaveBeenCalledWith(
        'Failed to update password:',
        mockResponse.error,
      );
    });
  });

  // ==========================================================================
  // UPDATE USER METADATA TESTS
  // ==========================================================================

  describe('updateUserMetadata', () => {
    const NEW_METADATA = { name: 'New Name' };

    it('should update user metadata successfully', async () => {
      const mockResponse = createSuccessResponse({ user: mockUser });
      mockSupabaseClient.auth.admin.updateUserById.mockResolvedValue(
        mockResponse,
      );

      const result = await service.updateUserMetadata(
        TEST_USER_ID,
        NEW_METADATA,
      );

      expect(mockSupabaseClient.auth.admin.updateUserById).toHaveBeenCalledWith(
        TEST_USER_ID,
        { user_metadata: NEW_METADATA },
      );
      expect(result).toEqual(mockUser);
    });

    it('should throw error when metadata update fails', async () => {
      const mockResponse = createErrorResponse('Metadata update failed');
      mockSupabaseClient.auth.admin.updateUserById.mockResolvedValue(
        mockResponse,
      );

      await expect(
        service.updateUserMetadata(TEST_USER_ID, NEW_METADATA),
      ).rejects.toEqual(mockResponse.error);
    });

    it('should log error when metadata update fails', async () => {
      const mockResponse = createErrorResponse('Metadata update failed');
      mockSupabaseClient.auth.admin.updateUserById.mockResolvedValue(
        mockResponse,
      );

      const loggerSpy = jest.spyOn(Logger.prototype, 'error');

      try {
        await service.updateUserMetadata(TEST_USER_ID, NEW_METADATA);
      } catch (error) {
        // Expected
      }

      expect(loggerSpy).toHaveBeenCalledWith(
        'Failed to update metadata:',
        mockResponse.error,
      );
    });
  });

  // ==========================================================================
  // SEND PASSWORD RECOVERY EMAIL TESTS
  // ==========================================================================

  describe('sendPasswordRecoveryEmail', () => {
    it('should send password recovery email successfully', async () => {
      const mockResponse = createSuccessResponse({});
      mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValue(
        mockResponse,
      );

      await service.sendPasswordRecoveryEmail(TEST_EMAIL);

      expect(
        mockSupabaseClient.auth.resetPasswordForEmail,
      ).toHaveBeenCalledWith(TEST_EMAIL, {
        redirectTo: 'https://test-frontend.com/auth/reset-password',
      });
    });

    it('should throw error when sending recovery email fails', async () => {
      const mockResponse = createErrorResponse('Recovery email failed');
      mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValue(
        mockResponse,
      );

      await expect(
        service.sendPasswordRecoveryEmail(TEST_EMAIL),
      ).rejects.toEqual(mockResponse.error);
    });

    it('should log error when sending recovery email fails', async () => {
      const mockResponse = createErrorResponse('Recovery email failed');
      mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValue(
        mockResponse,
      );

      const loggerSpy = jest.spyOn(Logger.prototype, 'error');

      try {
        await service.sendPasswordRecoveryEmail(TEST_EMAIL);
      } catch (error) {
        // Expected
      }

      expect(loggerSpy).toHaveBeenCalledWith(
        'Failed to send recovery email:',
        mockResponse.error,
      );
    });
  });

  // ==========================================================================
  // SEND VERIFICATION EMAIL TESTS
  // ==========================================================================

  describe('sendVerificationEmail', () => {
    it('should send verification email successfully', async () => {
      const mockResponse = createSuccessResponse({});
      mockSupabaseClient.auth.resend.mockResolvedValue(mockResponse);

      await service.sendVerificationEmail(TEST_EMAIL);

      expect(mockSupabaseClient.auth.resend).toHaveBeenCalledWith({
        type: 'signup',
        email: TEST_EMAIL,
      });
    });

    it('should throw error when sending verification email fails', async () => {
      const mockResponse = createErrorResponse('Verification email failed');
      mockSupabaseClient.auth.resend.mockResolvedValue(mockResponse);

      await expect(service.sendVerificationEmail(TEST_EMAIL)).rejects.toEqual(
        mockResponse.error,
      );
    });

    it('should log error when sending verification email fails', async () => {
      const mockResponse = createErrorResponse('Verification email failed');
      mockSupabaseClient.auth.resend.mockResolvedValue(mockResponse);

      const loggerSpy = jest.spyOn(Logger.prototype, 'error');

      try {
        await service.sendVerificationEmail(TEST_EMAIL);
      } catch (error) {
        // Expected
      }

      expect(loggerSpy).toHaveBeenCalledWith(
        'Failed to send verification email:',
        mockResponse.error,
      );
    });
  });
});
