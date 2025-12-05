// src/modules/core/auth/__tests__/supabase.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { SupabaseService } from '../services/supabase.service';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

// Mock the entire supabase-js module
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

const mockCreateClient = createClient as jest.MockedFunction<
  typeof createClient
>;

describe('SupabaseService', () => {
  let service: SupabaseService;
  let mockSupabaseClient: jest.Mocked<SupabaseClient<any, any, any, any>>; // Use the generic client type
  let mockUser: User;

  const mockUserId = 'test-user-id';
  const mockEmail = 'test@example.com';
  const mockPassword = 'test-password';
  const mockAccessToken = 'test-access-token';
  const mockRefreshToken = 'test-refresh-token';

  beforeEach(async () => {
    // Set up environment variables
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
    process.env.SUPABASE_ANON_KEY = 'test-anon-key';
    process.env.FRONTEND_URL = 'https://test-frontend.com';

    // Create mock objects
    mockUser = {
      id: mockUserId,
      email: mockEmail,
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
    };

    // Mock the Supabase client and its auth/admin methods
    mockSupabaseClient = {
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
        // Add other auth methods as needed, e.g., signUp, signOut, etc.
      },
      // Add other client methods if your service uses them (e.g., from, rpc)
      // For now, we'll just mock the auth part as that's what the service uses
    } as jest.Mocked<SupabaseClient<any, any, any, any>>;

    // Mock the createClient function to return our mocked client
    mockCreateClient.mockReturnValue(mockSupabaseClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [SupabaseService],
    }).compile();

    service = module.get<SupabaseService>(SupabaseService);
    service.onModuleInit(); // Initialize the service to set up the client
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

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

  describe('createUser', () => {
    it('should create a user successfully', async () => {
      const mockResponse = {
        data: { user: mockUser },
        error: null,
      };
      (
        mockSupabaseClient.auth.admin.createUser as jest.MockedFunction<any>
      ).mockResolvedValue(mockResponse);

      const result = await service.createUser(mockEmail, mockPassword, {
        name: 'Test User',
      });

      expect(mockSupabaseClient.auth.admin.createUser).toHaveBeenCalledWith({
        email: mockEmail,
        password: mockPassword,
        user_metadata: { name: 'Test User' },
      });
      expect(result).toEqual(mockUser);
    });

    it('should create a user with empty metadata when not provided', async () => {
      const mockResponse = {
        data: { user: mockUser },
        error: null,
      };
      (
        mockSupabaseClient.auth.admin.createUser as jest.MockedFunction<any>
      ).mockResolvedValue(mockResponse);

      await service.createUser(mockEmail, mockPassword);

      expect(mockSupabaseClient.auth.admin.createUser).toHaveBeenCalledWith({
        email: mockEmail,
        password: mockPassword,
        user_metadata: {}, // Should default to empty object
      });
    });

    it('should throw error when user creation fails', async () => {
      const mockError = { message: 'User creation failed', code: '400' };
      const mockResponse = {
        data: { user: null },
        error: mockError,
      };
      (
        mockSupabaseClient.auth.admin.createUser as jest.MockedFunction<any>
      ).mockResolvedValue(mockResponse);

      await expect(service.createUser(mockEmail, mockPassword)).rejects.toEqual(
        mockError,
      );
    });

    it('should log error when user creation fails', async () => {
      const mockError = { message: 'User creation failed', code: '400' };
      const mockResponse = {
        data: { user: null },
        error: mockError,
      };
      (
        mockSupabaseClient.auth.admin.createUser as jest.MockedFunction<any>
      ).mockResolvedValue(mockResponse);

      const loggerSpy = jest.spyOn(Logger.prototype, 'error');

      try {
        await service.createUser(mockEmail, mockPassword);
      } catch (error) {
        // Expected
      }

      expect(loggerSpy).toHaveBeenCalledWith(
        'Failed to create user:',
        mockError,
      );
    });
  });

  describe('deleteUser', () => {
    it('should delete a user successfully', async () => {
      const mockResponse = {
        data: {},
        error: null,
      };
      (
        mockSupabaseClient.auth.admin.deleteUser as jest.MockedFunction<any>
      ).mockResolvedValue(mockResponse);

      await service.deleteUser(mockUserId);

      expect(mockSupabaseClient.auth.admin.deleteUser).toHaveBeenCalledWith(
        mockUserId,
      );
    });

    it('should throw error when user deletion fails', async () => {
      const mockError = { message: 'User deletion failed', code: '400' };
      const mockResponse = {
        data: {},
        error: mockError,
      };
      (
        mockSupabaseClient.auth.admin.deleteUser as jest.MockedFunction<any>
      ).mockResolvedValue(mockResponse);

      await expect(service.deleteUser(mockUserId)).rejects.toEqual(mockError);
    });

    it('should log error when user deletion fails', async () => {
      const mockError = { message: 'User deletion failed', code: '400' };
      const mockResponse = {
        data: {},
        error: mockError,
      };
      (
        mockSupabaseClient.auth.admin.deleteUser as jest.MockedFunction<any>
      ).mockResolvedValue(mockResponse);

      const loggerSpy = jest.spyOn(Logger.prototype, 'error');

      try {
        await service.deleteUser(mockUserId);
      } catch (error) {
        // Expected
      }

      expect(loggerSpy).toHaveBeenCalledWith(
        'Failed to delete user:',
        mockError,
      );
    });
  });

  describe('signInWithPassword', () => {
    it('should sign in with password successfully', async () => {
      const mockSession = {
        access_token: mockAccessToken,
        refresh_token: mockRefreshToken,
        user: mockUser,
      };
      const mockResponse = {
        data: { user: mockUser, session: mockSession },
        error: null,
      };
      (
        mockSupabaseClient.auth.signInWithPassword as jest.MockedFunction<any>
      ).mockResolvedValue(mockResponse);

      const result = await service.signInWithPassword(mockEmail, mockPassword);

      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: mockEmail,
        password: mockPassword,
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should throw error when sign in fails', async () => {
      const mockError = { message: 'Sign in failed', code: '400' };
      const mockResponse = {
        data: { user: null, session: null },
        error: mockError,
      };
      (
        mockSupabaseClient.auth.signInWithPassword as jest.MockedFunction<any>
      ).mockResolvedValue(mockResponse);

      await expect(
        service.signInWithPassword(mockEmail, mockPassword),
      ).rejects.toEqual(mockError);
    });

    it('should log error when sign in fails', async () => {
      const mockError = { message: 'Sign in failed', code: '400' };
      const mockResponse = {
        data: { user: null, session: null },
        error: mockError,
      };
      (
        mockSupabaseClient.auth.signInWithPassword as jest.MockedFunction<any>
      ).mockResolvedValue(mockResponse);

      const loggerSpy = jest.spyOn(Logger.prototype, 'error');

      try {
        await service.signInWithPassword(mockEmail, mockPassword);
      } catch (error) {
        // Expected
      }

      expect(loggerSpy).toHaveBeenCalledWith('Sign in failed:', mockError);
    });
  });

  describe('signOut', () => {
    it('should sign out user successfully', async () => {
      const mockResponse = {
        data: {},
        error: null,
      };

      const mockUserClient = {
        auth: {
          signOut: jest.fn().mockResolvedValue(mockResponse),
        },
      } as jest.Mocked<SupabaseClient<any, any, any, any>>;

      mockCreateClient.mockReturnValue(mockUserClient); // Mock createClient to return the user client for signOut

      await service.signOut(mockAccessToken);

      expect(mockCreateClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-anon-key',
        {
          global: {
            headers: {
              Authorization: `Bearer ${mockAccessToken}`,
            },
          },
        },
      );
      expect(mockUserClient.auth.signOut).toHaveBeenCalled();
    });

    it('should throw error when sign out fails', async () => {
      const mockError = { message: 'Sign out failed', code: '400' };
      const mockResponse = {
        data: {},
        error: mockError,
      };

      const mockUserClient = {
        auth: {
          signOut: jest.fn().mockResolvedValue(mockResponse),
        },
      } as jest.Mocked<SupabaseClient<any, any, any, any>>;

      mockCreateClient.mockReturnValue(mockUserClient);

      await expect(service.signOut(mockAccessToken)).rejects.toEqual(mockError);
    });

    it('should log error when sign out fails', async () => {
      const mockError = { message: 'Sign out failed', code: '400' };
      const mockResponse = {
        data: {},
        error: mockError,
      };

      const mockUserClient = {
        auth: {
          signOut: jest.fn().mockResolvedValue(mockResponse),
        },
      } as jest.Mocked<SupabaseClient<any, any, any, any>>;

      mockCreateClient.mockReturnValue(mockUserClient);

      const loggerSpy = jest.spyOn(Logger.prototype, 'error');

      try {
        await service.signOut(mockAccessToken);
      } catch (error) {
        // Expected
      }

      expect(loggerSpy).toHaveBeenCalledWith('Sign out failed:', mockError);
    });
  });

  describe('verifyToken', () => {
    it('should verify token and return user successfully', async () => {
      const mockResponse = {
        data: { user: mockUser },
        error: null,
      };
      (
        mockSupabaseClient.auth.getUser as jest.MockedFunction<any>
      ).mockResolvedValue(mockResponse);

      const result = await service.verifyToken(mockAccessToken);

      expect(mockSupabaseClient.auth.getUser).toHaveBeenCalledWith(
        mockAccessToken,
      );
      expect(result).toEqual(mockUser);
    });

    it('should throw error when token verification fails', async () => {
      const mockError = { message: 'Token verification failed', code: '400' };
      const mockResponse = {
        data: { user: null },
        error: mockError,
      };
      (
        mockSupabaseClient.auth.getUser as jest.MockedFunction<any>
      ).mockResolvedValue(mockResponse);

      await expect(service.verifyToken(mockAccessToken)).rejects.toEqual(
        mockError,
      );
    });

    it('should throw error when user not found', async () => {
      const mockResponse = {
        data: { user: null },
        error: null,
      };
      (
        mockSupabaseClient.auth.getUser as jest.MockedFunction<any>
      ).mockResolvedValue(mockResponse);

      await expect(service.verifyToken(mockAccessToken)).rejects.toEqual(
        new Error('User not found'),
      );
    });

    it('should log error when token verification fails', async () => {
      const mockError = { message: 'Token verification failed', code: '400' };
      const mockResponse = {
        data: { user: null },
        error: mockError,
      };
      (
        mockSupabaseClient.auth.getUser as jest.MockedFunction<any>
      ).mockResolvedValue(mockResponse);

      const loggerSpy = jest.spyOn(Logger.prototype, 'error');

      try {
        await service.verifyToken(mockAccessToken);
      } catch (error) {
        // Expected
      }

      expect(loggerSpy).toHaveBeenCalledWith(
        'Token verification failed:',
        mockError,
      );
    });
  });

  describe('refreshSession', () => {
    it('should refresh session successfully', async () => {
      const mockSession = {
        access_token: 'new-access-token',
        refresh_token: mockRefreshToken,
        user: mockUser,
      };
      const mockResponse = {
        data: { user: mockUser, session: mockSession },
        error: null,
      };
      (
        mockSupabaseClient.auth.refreshSession as jest.MockedFunction<any>
      ).mockResolvedValue(mockResponse);

      const result = await service.refreshSession(mockRefreshToken);

      expect(mockSupabaseClient.auth.refreshSession).toHaveBeenCalledWith({
        refresh_token: mockRefreshToken,
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should throw error when session refresh fails', async () => {
      const mockError = { message: 'Session refresh failed', code: '400' };
      const mockResponse = {
        data: { user: null, session: null },
        error: mockError,
      };
      (
        mockSupabaseClient.auth.refreshSession as jest.MockedFunction<any>
      ).mockResolvedValue(mockResponse);

      await expect(service.refreshSession(mockRefreshToken)).rejects.toEqual(
        mockError,
      );
    });

    it('should log error when session refresh fails', async () => {
      const mockError = { message: 'Session refresh failed', code: '400' };
      const mockResponse = {
        data: { user: null, session: null },
        error: mockError,
      };
      (
        mockSupabaseClient.auth.refreshSession as jest.MockedFunction<any>
      ).mockResolvedValue(mockResponse);

      const loggerSpy = jest.spyOn(Logger.prototype, 'error');

      try {
        await service.refreshSession(mockRefreshToken);
      } catch (error) {
        // Expected
      }

      expect(loggerSpy).toHaveBeenCalledWith(
        'Session refresh failed:',
        mockError,
      );
    });
  });

  describe('updateUserEmail', () => {
    it('should update user email successfully', async () => {
      const mockResponse = {
        data: { user: mockUser },
        error: null,
      };
      (
        mockSupabaseClient.auth.admin.updateUserById as jest.MockedFunction<any>
      ).mockResolvedValue(mockResponse);

      const result = await service.updateUserEmail(
        mockUserId,
        'new@example.com',
      );

      expect(mockSupabaseClient.auth.admin.updateUserById).toHaveBeenCalledWith(
        mockUserId,
        {
          email: 'new@example.com',
        },
      );
      expect(result).toEqual(mockUser);
    });

    it('should throw error when email update fails', async () => {
      const mockError = { message: 'Email update failed', code: '400' };
      const mockResponse = {
        data: { user: null },
        error: mockError,
      };
      (
        mockSupabaseClient.auth.admin.updateUserById as jest.MockedFunction<any>
      ).mockResolvedValue(mockResponse);

      await expect(
        service.updateUserEmail(mockUserId, 'new@example.com'),
      ).rejects.toEqual(mockError);
    });

    it('should log error when email update fails', async () => {
      const mockError = { message: 'Email update failed', code: '400' };
      const mockResponse = {
        data: { user: null },
        error: mockError,
      };
      (
        mockSupabaseClient.auth.admin.updateUserById as jest.MockedFunction<any>
      ).mockResolvedValue(mockResponse);

      const loggerSpy = jest.spyOn(Logger.prototype, 'error');

      try {
        await service.updateUserEmail(mockUserId, 'new@example.com');
      } catch (error) {
        // Expected
      }

      expect(loggerSpy).toHaveBeenCalledWith(
        'Failed to update email:',
        mockError,
      );
    });
  });

  describe('updateUserPassword', () => {
    it('should update user password successfully', async () => {
      const mockResponse = {
        data: { user: mockUser },
        error: null,
      };
      (
        mockSupabaseClient.auth.admin.updateUserById as jest.MockedFunction<any>
      ).mockResolvedValue(mockResponse);

      const result = await service.updateUserPassword(
        mockUserId,
        'new-password',
      );

      expect(mockSupabaseClient.auth.admin.updateUserById).toHaveBeenCalledWith(
        mockUserId,
        {
          password: 'new-password',
        },
      );
      expect(result).toEqual(mockUser);
    });

    it('should throw error when password update fails', async () => {
      const mockError = { message: 'Password update failed', code: '400' };
      const mockResponse = {
        data: { user: null },
        error: mockError,
      };
      (
        mockSupabaseClient.auth.admin.updateUserById as jest.MockedFunction<any>
      ).mockResolvedValue(mockResponse);

      await expect(
        service.updateUserPassword(mockUserId, 'new-password'),
      ).rejects.toEqual(mockError);
    });

    it('should log error when password update fails', async () => {
      const mockError = { message: 'Password update failed', code: '400' };
      const mockResponse = {
        data: { user: null },
        error: mockError,
      };
      (
        mockSupabaseClient.auth.admin.updateUserById as jest.MockedFunction<any>
      ).mockResolvedValue(mockResponse);

      const loggerSpy = jest.spyOn(Logger.prototype, 'error');

      try {
        await service.updateUserPassword(mockUserId, 'new-password');
      } catch (error) {
        // Expected
      }

      expect(loggerSpy).toHaveBeenCalledWith(
        'Failed to update password:',
        mockError,
      );
    });
  });

  describe('updateUserMetadata', () => {
    it('should update user metadata successfully', async () => {
      const mockResponse = {
        data: { user: mockUser },
        error: null,
      };
      (
        mockSupabaseClient.auth.admin.updateUserById as jest.MockedFunction<any>
      ).mockResolvedValue(mockResponse);

      const result = await service.updateUserMetadata(mockUserId, {
        name: 'New Name',
      });

      expect(mockSupabaseClient.auth.admin.updateUserById).toHaveBeenCalledWith(
        mockUserId,
        {
          user_metadata: { name: 'New Name' },
        },
      );
      expect(result).toEqual(mockUser);
    });

    it('should throw error when metadata update fails', async () => {
      const mockError = { message: 'Metadata update failed', code: '400' };
      const mockResponse = {
        data: { user: null },
        error: mockError,
      };
      (
        mockSupabaseClient.auth.admin.updateUserById as jest.MockedFunction<any>
      ).mockResolvedValue(mockResponse);

      await expect(
        service.updateUserMetadata(mockUserId, { name: 'New Name' }),
      ).rejects.toEqual(mockError);
    });

    it('should log error when metadata update fails', async () => {
      const mockError = { message: 'Metadata update failed', code: '400' };
      const mockResponse = {
        data: { user: null },
        error: mockError,
      };
      (
        mockSupabaseClient.auth.admin.updateUserById as jest.MockedFunction<any>
      ).mockResolvedValue(mockResponse);

      const loggerSpy = jest.spyOn(Logger.prototype, 'error');

      try {
        await service.updateUserMetadata(mockUserId, { name: 'New Name' });
      } catch (error) {
        // Expected
      }

      expect(loggerSpy).toHaveBeenCalledWith(
        'Failed to update metadata:',
        mockError,
      );
    });
  });

  describe('sendPasswordRecoveryEmail', () => {
    it('should send password recovery email successfully', async () => {
      const mockResponse = {
        data: {},
        error: null,
      };
      (
        mockSupabaseClient.auth
          .resetPasswordForEmail as jest.MockedFunction<any>
      ).mockResolvedValue(mockResponse);

      await service.sendPasswordRecoveryEmail(mockEmail);

      expect(
        mockSupabaseClient.auth.resetPasswordForEmail,
      ).toHaveBeenCalledWith(mockEmail, {
        redirectTo: 'https://test-frontend.com/auth/reset-password',
      });
    });

    it('should throw error when sending recovery email fails', async () => {
      const mockError = { message: 'Recovery email failed', code: '400' };
      const mockResponse = {
        data: {},
        error: mockError,
      };
      (
        mockSupabaseClient.auth
          .resetPasswordForEmail as jest.MockedFunction<any>
      ).mockResolvedValue(mockResponse);

      await expect(
        service.sendPasswordRecoveryEmail(mockEmail),
      ).rejects.toEqual(mockError);
    });

    it('should log error when sending recovery email fails', async () => {
      const mockError = { message: 'Recovery email failed', code: '400' };
      const mockResponse = {
        data: {},
        error: mockError,
      };
      (
        mockSupabaseClient.auth
          .resetPasswordForEmail as jest.MockedFunction<any>
      ).mockResolvedValue(mockResponse);

      const loggerSpy = jest.spyOn(Logger.prototype, 'error');

      try {
        await service.sendPasswordRecoveryEmail(mockEmail);
      } catch (error) {
        // Expected
      }

      expect(loggerSpy).toHaveBeenCalledWith(
        'Failed to send recovery email:',
        mockError,
      );
    });
  });

  describe('sendVerificationEmail', () => {
    it('should send verification email successfully', async () => {
      const mockResponse = {
        data: {},
        error: null,
      };
      (
        mockSupabaseClient.auth.resend as jest.MockedFunction<any>
      ).mockResolvedValue(mockResponse);

      await service.sendVerificationEmail(mockEmail);

      expect(mockSupabaseClient.auth.resend).toHaveBeenCalledWith({
        type: 'signup',
        email: mockEmail,
      });
    });

    it('should throw error when sending verification email fails', async () => {
      const mockError = { message: 'Verification email failed', code: '400' };
      const mockResponse = {
        data: {},
        error: mockError,
      };
      (
        mockSupabaseClient.auth.resend as jest.MockedFunction<any>
      ).mockResolvedValue(mockResponse);

      await expect(service.sendVerificationEmail(mockEmail)).rejects.toEqual(
        mockError,
      );
    });

    it('should log error when sending verification email fails', async () => {
      const mockError = { message: 'Verification email failed', code: '400' };
      const mockResponse = {
        data: {},
        error: mockError,
      };
      (
        mockSupabaseClient.auth.resend as jest.MockedFunction<any>
      ).mockResolvedValue(mockResponse);

      const loggerSpy = jest.spyOn(Logger.prototype, 'error');

      try {
        await service.sendVerificationEmail(mockEmail);
      } catch (error) {
        // Expected
      }

      expect(loggerSpy).toHaveBeenCalledWith(
        'Failed to send verification email:',
        mockError,
      );
    });
  });
});
