// src/modules/core/auth/auth.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { ERROR_CODES } from '@shared/error/constants/error-codes.constant';
import { AppError } from '@shared/error/classes/app-error.class';
import { ContextService } from '@shared/context/context.service';
import { NotificationService } from '@shared/notification/notification.service';
import { NotificationType } from '@shared/notification/interfaces';

import { SupabaseService } from './services/supabase.service';
import { UserService } from './services/user.service';

import {
  RegisterClientDto,
  RegisterSupervisorDto,
  RegisterStudentDto,
  RegisterUniversityDto,
  LoginDto,
  AuthResponseDto,
  UserResponseDto,
} from './dto/register.dto';

// Type for profile responses
type ProfileResponse =
  | { id: string; organizationName: string; industry?: string }
  | { id: string; universityId: string; employmentStatus: string }
  | {
      id: string;
      matricNumber: string;
      graduationStatus: string;
      skills?: string[];
    }
  | { id: string; name: string; location?: string; isVerified: boolean };

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private supabaseService: SupabaseService,
    private userService: UserService,
    private contextService: ContextService,
    private notificationService: NotificationService,
  ) {}

  // ==========================================================================
  // REGISTRATION METHODS
  // ==========================================================================

  /**
   * Register new client
   */
  async registerClient(dto: RegisterClientDto): Promise<AuthResponseDto> {
    // Check if email exists in our database
    const existing = await this.userService.findByEmail(dto.email);
    if (existing) {
      throw new AppError(
        ERROR_CODES.ALREADY_EXISTS,
        'User with this email already exists',
        { email: dto.email },
      );
    }

    try {
      // 1. Create user in Supabase Auth
      const supabaseUser = await this.supabaseService.createUser(
        dto.email,
        dto.password,
        { name: dto.organizationName },
      );

      // 2. Create session (login the user)
      const { session } = await this.supabaseService.signInWithPassword(
        dto.email,
        dto.password,
      );

      if (!session) {
        throw new Error('Failed to create session after registration');
      }

      // 3. Create user + client profile in our database
      const { user, client } = await this.userService.createClient(
        {
          id: supabaseUser.id,
          email: dto.email,
          name: dto.organizationName,
          role: 'client',
          emailVerified: supabaseUser.email_confirmed_at !== null,
        },
        {
          organizationName: dto.organizationName,
          industry: dto.industry,
          orgDocumentUrl: dto.orgDocumentUrl,
        },
      );

      // 4. Populate context
      this.contextService.setMeta({
        userId: user.id,
        username: user.name || user.email.split('@')[0],
        email: user.email,
        orgId: client.id,
        correlationId: uuidv4(),
        timestamp: new Date(),
      });

      // 5. Send success notification
      await this.notificationService.push({
        type: NotificationType.SUCCESS,
        message: 'Account created successfully! Welcome to Gradlinq.',
        context: { userId: user.id, role: user.role },
      });

      this.logger.log(`Client registered: ${user.email}`);

      // 6. Return response
      return {
        user: this.mapUserResponse(user),
        session: {
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
          expiresAt: session.expires_at!,
        },
        profile: {
          id: client.id,
          organizationName: client.organizationName,
          industry: client.industry || undefined,
        },
      };
    } catch (error) {
      this.logger.error('Client registration failed:', error);
      throw this.handleSupabaseError(error, 'Registration failed');
    }
  }

  /**
   * Register new supervisor
   */
  async registerSupervisor(
    dto: RegisterSupervisorDto,
  ): Promise<AuthResponseDto> {
    const existing = await this.userService.findByEmail(dto.email);
    if (existing) {
      throw new AppError(
        ERROR_CODES.ALREADY_EXISTS,
        'User with this email already exists',
        { email: dto.email },
      );
    }

    try {
      // 1. Create user in Supabase Auth
      const supabaseUser = await this.supabaseService.createUser(
        dto.email,
        dto.password,
      );

      // 2. Create session
      const { session } = await this.supabaseService.signInWithPassword(
        dto.email,
        dto.password,
      );

      if (!session) {
        throw new Error('Failed to create session after registration');
      }

      // 3. Create user + supervisor profile in our database
      const { user, supervisor } = await this.userService.createSupervisor(
        {
          id: supabaseUser.id,
          email: dto.email,
          role: 'supervisor',
          emailVerified: supabaseUser.email_confirmed_at !== null,
        },
        {
          universityId: dto.universityId,
          employmentDocumentUrl: dto.employmentDocumentUrl,
        },
      );

      // 4. Populate context
      this.contextService.setMeta({
        userId: user.id,
        email: user.email,
        orgId: supervisor.universityId,
        correlationId: uuidv4(),
        timestamp: new Date(),
      });

      // 5. Send notification
      await this.notificationService.push({
        type: NotificationType.SUCCESS,
        message: 'Supervisor account created successfully!',
        context: { userId: user.id, role: user.role },
      });

      this.logger.log(`Supervisor registered: ${user.email}`);

      return {
        user: this.mapUserResponse(user),
        session: {
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
          expiresAt: session.expires_at!,
        },
        profile: {
          id: supervisor.id,
          universityId: supervisor.universityId,
          employmentStatus: supervisor.employmentStatus,
        },
      };
    } catch (error) {
      this.logger.error('Supervisor registration failed:', error);
      throw this.handleSupabaseError(error, 'Registration failed');
    }
  }

  /**
   * Register new student
   */
  async registerStudent(dto: RegisterStudentDto): Promise<AuthResponseDto> {
    const existing = await this.userService.findByEmail(dto.email);
    if (existing) {
      throw new AppError(
        ERROR_CODES.ALREADY_EXISTS,
        'User with this email already exists',
        { email: dto.email },
      );
    }

    try {
      // 1. Create user in Supabase Auth
      const supabaseUser = await this.supabaseService.createUser(
        dto.email,
        dto.password,
        { name: dto.matricNumber },
      );

      // 2. Create session
      const { session } = await this.supabaseService.signInWithPassword(
        dto.email,
        dto.password,
      );

      if (!session) {
        throw new Error('Failed to create session after registration');
      }

      // 3. Create user + student profile
      const { user, student } = await this.userService.createStudent(
        {
          id: supabaseUser.id,
          email: dto.email,
          name: dto.matricNumber,
          role: 'student',
          emailVerified: supabaseUser.email_confirmed_at !== null,
        },
        {
          matricNumber: dto.matricNumber,
          skills: dto.skills,
        },
      );

      // 4. Populate context
      this.contextService.setMeta({
        userId: user.id,
        email: user.email,
        correlationId: uuidv4(),
        timestamp: new Date(),
      });

      // 5. Send notification
      await this.notificationService.push({
        type: NotificationType.SUCCESS,
        message:
          'Student account created successfully! Start exploring opportunities.',
        context: { userId: user.id, role: user.role },
      });

      this.logger.log(`Student registered: ${user.email}`);

      return {
        user: this.mapUserResponse(user),
        session: {
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
          expiresAt: session.expires_at!,
        },
        profile: {
          id: student.id,
          matricNumber: student.matricNumber,
          graduationStatus: student.graduationStatus,
          skills: student.skills || undefined,
        },
      };
    } catch (error) {
      this.logger.error('Student registration failed:', error);
      throw this.handleSupabaseError(error, 'Registration failed');
    }
  }

  /**
   * Register new university
   */
  async registerUniversity(
    dto: RegisterUniversityDto,
  ): Promise<AuthResponseDto> {
    const existing = await this.userService.findByEmail(dto.email);
    if (existing) {
      throw new AppError(
        ERROR_CODES.ALREADY_EXISTS,
        'User with this email already exists',
        { email: dto.email },
      );
    }

    try {
      // 1. Create user in Supabase Auth
      const supabaseUser = await this.supabaseService.createUser(
        dto.email,
        dto.password,
        { name: dto.name },
      );

      // 2. Create session
      const { session } = await this.supabaseService.signInWithPassword(
        dto.email,
        dto.password,
      );

      if (!session) {
        throw new Error('Failed to create session after registration');
      }

      // 3. Create user + university profile
      const { user, university } = await this.userService.createUniversity(
        {
          id: supabaseUser.id,
          email: dto.email,
          name: dto.name,
          role: 'university',
          emailVerified: supabaseUser.email_confirmed_at !== null,
        },
        {
          name: dto.name,
          location: dto.location,
          verificationDocumentUrl: dto.verificationDocumentUrl,
        },
      );

      // 4. Populate context
      this.contextService.setMeta({
        userId: user.id,
        email: user.email,
        orgId: university.id,
        correlationId: uuidv4(),
        timestamp: new Date(),
      });

      // 5. Send notification
      await this.notificationService.push({
        type: NotificationType.SUCCESS,
        message: 'University account created successfully!',
        context: { userId: user.id, role: user.role },
      });

      this.logger.log(`University registered: ${user.email}`);

      return {
        user: this.mapUserResponse(user),
        session: {
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
          expiresAt: session.expires_at!,
        },
        profile: {
          id: university.id,
          name: university.name,
          location: university.location || undefined,
          isVerified: university.isVerified,
        },
      };
    } catch (error) {
      this.logger.error('University registration failed:', error);
      throw this.handleSupabaseError(error, 'Registration failed');
    }
  }

  // ==========================================================================
  // AUTHENTICATION METHODS
  // ==========================================================================

  /**
   * Login user (unified for all roles)
   */
  async login(dto: LoginDto): Promise<AuthResponseDto> {
    try {
      // 1. Authenticate with Supabase
      const { session, user: supabaseUser } =
        await this.supabaseService.signInWithPassword(dto.email, dto.password);

      if (!session || !supabaseUser) {
        throw new Error('Invalid credentials');
      }

      // 2. Find user in our database
      const user = await this.userService.findById(supabaseUser.id);

      if (!user) {
        throw new AppError(
          ERROR_CODES.RESOURCE_NOT_FOUND,
          'User profile not found',
          { supabaseId: supabaseUser.id },
        );
      }

      // 3. Check if account is active
      if (!user.isActive) {
        throw new AppError(
          ERROR_CODES.OPERATION_NOT_ALLOWED,
          'Account is inactive',
          { userId: user.id },
        );
      }

      // 4. Get user profile
      const { profile } = await this.userService.getUserWithProfile(user.id);
      const orgId = this.getOrgId(user.role, profile);

      // 5. Populate context
      this.contextService.setMeta({
        userId: user.id,
        username: user.name || user.email.split('@')[0],
        email: user.email,
        orgId,
        correlationId: uuidv4(),
        timestamp: new Date(),
      });

      // 6. Send welcome notification
      await this.notificationService.push({
        type: NotificationType.SUCCESS,
        message: `Welcome back, ${user.email}!`,
        context: {
          userId: user.id,
          role: user.role,
          loginTime: new Date().toISOString(),
        },
      });

      this.logger.log(`User logged in: ${user.email}`);

      return {
        user: this.mapUserResponse(user),
        session: {
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
          expiresAt: session.expires_at!,
        },
        profile: this.mapProfile(user.role, profile),
      };
    } catch (error) {
      this.logger.error('Login failed:', error);

      await this.notificationService.push({
        type: NotificationType.ERROR,
        message: 'Login failed. Please check your credentials.',
        context: { email: dto.email },
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        ERROR_CODES.INVALID_CREDENTIALS,
        'Invalid email or password',
        { email: dto.email },
      );
    }
  }

  /**
   * Logout user
   */
  async logout(accessToken: string, userId?: string): Promise<void> {
    try {
      await this.supabaseService.signOut(accessToken);

      if (userId) {
        await this.notificationService.push({
          type: NotificationType.INFO,
          message: 'You have been logged out successfully.',
          context: { userId },
        });

        this.logger.log(`User logged out: ${userId}`);
      }
    } catch (error) {
      this.logger.error('Logout failed:', error);
      throw new AppError(ERROR_CODES.INTERNAL_SERVER_ERROR, 'Logout failed');
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
  }> {
    try {
      const { session } =
        await this.supabaseService.refreshSession(refreshToken);

      if (!session) {
        throw new Error('Failed to refresh session');
      }

      return {
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        expiresAt: session.expires_at!,
      };
    } catch (error) {
      this.logger.error('Token refresh failed:', error);
      throw new AppError(
        ERROR_CODES.UNAUTHORIZED,
        'Invalid or expired refresh token',
      );
    }
  }

  /**
   * Verify session and get user
   */
  async verifySession(accessToken: string): Promise<{
    user: UserResponseDto;
    profile: ProfileResponse | undefined;
  }> {
    try {
      // 1. Verify token with Supabase
      const supabaseUser = await this.supabaseService.verifyToken(accessToken);

      // 2. Get user from our database
      const user = await this.userService.findById(supabaseUser.id);

      if (!user) {
        throw new AppError(ERROR_CODES.RESOURCE_NOT_FOUND, 'User not found');
      }

      // 3. Get profile
      const { profile } = await this.userService.getUserWithProfile(user.id);

      return {
        user: this.mapUserResponse(user),
        profile: this.mapProfile(user.role, profile),
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      this.logger.error('Session verification failed:', error);
      throw new AppError(
        ERROR_CODES.UNAUTHORIZED,
        'Invalid or expired session',
      );
    }
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  private handleSupabaseError(
    error: unknown,
    defaultMessage: string,
  ): AppError {
    const err = error as Error & { message?: string };

    if (err.message?.includes('already registered')) {
      return new AppError(
        ERROR_CODES.ALREADY_EXISTS,
        'Email already registered',
      );
    }

    if (err.message?.includes('Invalid login credentials')) {
      return new AppError(
        ERROR_CODES.INVALID_CREDENTIALS,
        'Invalid credentials',
      );
    }

    if (err.message?.includes('Email not confirmed')) {
      return new AppError(
        ERROR_CODES.OPERATION_NOT_ALLOWED,
        'Email not confirmed',
      );
    }

    if (error instanceof AppError) {
      return error;
    }

    return new AppError(ERROR_CODES.INTERNAL_SERVER_ERROR, defaultMessage, {
      error: err.message || 'Unknown error',
    });
  }

  private getOrgId(
    role: string,
    profile: { id: string; universityId?: string } | undefined,
  ): string | undefined {
    if (!profile) return undefined;

    switch (role) {
      case 'client':
        return profile.id;
      case 'supervisor':
      case 'university':
        return profile.universityId || profile.id;
      default:
        return undefined;
    }
  }

  private mapUserResponse(user: {
    id: string;
    email: string;
    role: string;
    isActive: boolean;
    createdAt: Date;
  }): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }

  private mapProfile(
    role: string,
    profile:
      | {
          id: string;
          organizationName?: string;
          industry?: string | null;
          universityId?: string;
          employmentStatus?: string;
          matricNumber?: string;
          graduationStatus?: string;
          skills?: string[] | null;
          name?: string;
          location?: string | null;
          isVerified?: boolean;
        }
      | undefined,
  ): ProfileResponse | undefined {
    if (!profile) return undefined;

    switch (role) {
      case 'client':
        return {
          id: profile.id,
          organizationName: profile.organizationName || '',
          industry: profile.industry || undefined,
        };
      case 'supervisor':
        return {
          id: profile.id,
          universityId: profile.universityId || '',
          employmentStatus: profile.employmentStatus || 'pending',
        };
      case 'student':
        return {
          id: profile.id,
          matricNumber: profile.matricNumber || '',
          graduationStatus: profile.graduationStatus || 'undergraduate',
          skills: profile.skills || undefined,
        };
      case 'university':
        return {
          id: profile.id,
          name: profile.name || '',
          location: profile.location || undefined,
          isVerified: profile.isVerified || false,
        };
      default:
        return undefined;
    }
  }
}
