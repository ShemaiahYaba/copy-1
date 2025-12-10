// src/modules/core/auth/__tests__/supabase.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { SupabaseService } from '../services/supabase.service';
import {
  createClient,
  SupabaseClient,
  User,
  AuthError,
} from '@supabase/supabase-js';

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

const createSuccessResponse = <T>(data: T) => ({
  data,
  error: null,
});

const createErrorResponse = (
  message: string,
): { data: any; error: AuthError } => ({
  data: { user: null },
  error: { message, code: '400' } as AuthError,
});

const createMockSession = (user: User, overrides?: any) => ({
  access_token: 'test-access-token',
  refresh_token: 'test-refresh-token',
  user,
  ...overrides,
});

const createMockSupabaseClient = (): jest.Mocked<
  SupabaseClient<any, any, any, any, any>
> => ({
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
  from: jest.fn(),
  schema: jest.fn(),
  table: jest.fn(),
  rpc: jest.fn(),
  removeSubscription: jest.fn(),
  removeAllSubscriptions: jest.fn(),
  rest: {} as any,
  functions: {} as any,
  storage: {} as any,
  realtime: {} as any,
});

// ============================================================================
// TEST ENVIRONMENT SETUP
// ============================================================================

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
  let mockSupabaseClient: jest.Mocked<SupabaseClient<any, any, any, any, any>>;
  let mockUser: User;

  const TEST_USER_ID = 'test-user-id';
  const TEST_EMAIL = 'test@example.com';
  const TEST_PASSWORD = 'test-password';
  const TEST_ACCESS_TOKEN = 'test-access-token';
  const TEST_REFRESH_TOKEN = 'test-refresh-token';

  beforeEach(async () => {
    setupTestEnvironment();

    mockUser = createMockUser();
    mockSupabaseClient = createMockSupabaseClient();

    // Always return the same mock client (Option A)
    mockCreateClient.mockReturnValue(mockSupabaseClient);

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
  // INITIALIZATION
  // ==========================================================================

  describe('Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize Supabase client', () => {
      expect(service.getClient()).toBeDefined();
      expect(service.getClient()).toBe(mockSupabaseClient);
    });

    it('should throw if env variables missing', () => {
      delete process.env.SUPABASE_URL;
      expect(() => service.onModuleInit()).toThrow();

      process.env.SUPABASE_URL = 'url';
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      expect(() => service.onModuleInit()).toThrow();
    });

    it('should call createClient with correct config', () => {
      expect(mockCreateClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-service-key',
        { auth: { autoRefreshToken: false, persistSession: false } },
      );
    });
  });

  // ==========================================================================
  // CREATE USER
  // ==========================================================================

  describe('createUser', () => {
    it('should create user successfully', async () => {
      mockSupabaseClient.auth.admin.createUser.mockResolvedValue(
        createSuccessResponse({ user: mockUser }),
      );

      const result = await service.createUser(TEST_EMAIL, TEST_PASSWORD, {
        name: 'Test User',
      });

      expect(result).toEqual(mockUser);
      expect(mockSupabaseClient.auth.admin.createUser).toHaveBeenCalledWith({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        user_metadata: { name: 'Test User' },
        email_confirm: true,
      });
    });

    it('should throw error on failure', async () => {
      const err = createErrorResponse('Fail');
      mockSupabaseClient.auth.admin.createUser.mockResolvedValue(err);

      await expect(
        service.createUser(TEST_EMAIL, TEST_PASSWORD),
      ).rejects.toEqual(err.error);
    });
  });

  // ==========================================================================
  // DELETE USER
  // ==========================================================================

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      mockSupabaseClient.auth.admin.deleteUser.mockResolvedValue(
        createSuccessResponse({}),
      );

      await service.deleteUser(TEST_USER_ID);
      expect(mockSupabaseClient.auth.admin.deleteUser).toHaveBeenCalledWith(
        TEST_USER_ID,
      );
    });

    it('should throw error on failure', async () => {
      const err = createErrorResponse('Fail');
      mockSupabaseClient.auth.admin.deleteUser.mockResolvedValue(err);

      await expect(service.deleteUser(TEST_USER_ID)).rejects.toEqual(err.error);
    });
  });

  // ==========================================================================
  // SIGN IN
  // ==========================================================================

  describe('signInWithPassword', () => {
    it('should sign in successfully', async () => {
      const mockSession = createMockSession(mockUser);
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue(
        createSuccessResponse({ user: mockUser, session: mockSession }),
      );

      const result = await service.signInWithPassword(
        TEST_EMAIL,
        TEST_PASSWORD,
      );
      expect(result).toEqual({ user: mockUser, session: mockSession });
    });

    it('should throw on failure', async () => {
      const err = createErrorResponse('Fail');
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: err.error,
      });

      await expect(
        service.signInWithPassword(TEST_EMAIL, TEST_PASSWORD),
      ).rejects.toEqual(err.error);
    });
  });

  // ==========================================================================
  // SIGN OUT
  // ==========================================================================

  describe('signOut', () => {
    it('should sign out successfully', async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue(
        createSuccessResponse({}),
      );
      await service.signOut(TEST_ACCESS_TOKEN);
      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled();
    });

    it('should throw on failure', async () => {
      const err = createErrorResponse('Fail');
      mockSupabaseClient.auth.signOut.mockResolvedValue(err);
      await expect(service.signOut(TEST_ACCESS_TOKEN)).rejects.toEqual(
        err.error,
      );
    });
  });

  // ==========================================================================
  // VERIFY TOKEN
  // ==========================================================================

  describe('verifyToken', () => {
    it('should return user if token valid', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue(
        createSuccessResponse({ user: mockUser }),
      );
      const result = await service.verifyToken(TEST_ACCESS_TOKEN);
      expect(result).toEqual(mockUser);
    });

    it('should throw if no user', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue(
        createSuccessResponse({ user: null }),
      );
      await expect(service.verifyToken(TEST_ACCESS_TOKEN)).rejects.toThrow(
        'User not found',
      );
    });

    it('should throw on error', async () => {
      const err = createErrorResponse('Fail');
      mockSupabaseClient.auth.getUser.mockResolvedValue(err);
      await expect(service.verifyToken(TEST_ACCESS_TOKEN)).rejects.toEqual(
        err.error,
      );
    });
  });

  // ==========================================================================
  // REFRESH SESSION
  // ==========================================================================

  describe('refreshSession', () => {
    it('should refresh session successfully', async () => {
      const mockSession = createMockSession(mockUser, {
        access_token: 'new-token',
      });
      mockSupabaseClient.auth.refreshSession.mockResolvedValue(
        createSuccessResponse({ user: mockUser, session: mockSession }),
      );

      const result = await service.refreshSession(TEST_REFRESH_TOKEN);
      expect(result).toEqual({ user: mockUser, session: mockSession });
    });

    it('should throw on failure', async () => {
      const err = createErrorResponse('Fail');
      mockSupabaseClient.auth.refreshSession.mockResolvedValue({
        data: { user: null, session: null },
        error: err.error,
      });
      await expect(service.refreshSession(TEST_REFRESH_TOKEN)).rejects.toEqual(
        err.error,
      );
    });
  });

  // ==========================================================================
  // UPDATE USER (EMAIL, PASSWORD, METADATA)
  // ==========================================================================

  describe('updateUserEmail', () => {
    it('should update email', async () => {
      mockSupabaseClient.auth.admin.updateUserById.mockResolvedValue(
        createSuccessResponse({ user: mockUser }),
      );
      const result = await service.updateUserEmail(
        TEST_USER_ID,
        'new@example.com',
      );
      expect(result).toEqual(mockUser);
    });
  });

  describe('updateUserPassword', () => {
    it('should update password', async () => {
      mockSupabaseClient.auth.admin.updateUserById.mockResolvedValue(
        createSuccessResponse({ user: mockUser }),
      );
      const result = await service.updateUserPassword(TEST_USER_ID, 'new-pass');
      expect(result).toEqual(mockUser);
    });
  });

  describe('updateUserMetadata', () => {
    it('should update metadata', async () => {
      mockSupabaseClient.auth.admin.updateUserById.mockResolvedValue(
        createSuccessResponse({ user: mockUser }),
      );
      const result = await service.updateUserMetadata(TEST_USER_ID, {
        name: 'New',
      });
      expect(result).toEqual(mockUser);
    });
  });

  // ==========================================================================
  // PASSWORD RECOVERY
  // ==========================================================================

  describe('sendPasswordRecoveryEmail', () => {
    it('should send recovery email', async () => {
      mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValue(
        createSuccessResponse({}),
      );
      await service.sendPasswordRecoveryEmail(TEST_EMAIL);
      expect(mockSupabaseClient.auth.resetPasswordForEmail).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // EMAIL VERIFICATION
  // ==========================================================================

  describe('sendVerificationEmail', () => {
    it('should send verification email', async () => {
      mockSupabaseClient.auth.resend.mockResolvedValue(
        createSuccessResponse({}),
      );
      await service.sendVerificationEmail(TEST_EMAIL);
      expect(mockSupabaseClient.auth.resend).toHaveBeenCalled();
    });
  });
});
