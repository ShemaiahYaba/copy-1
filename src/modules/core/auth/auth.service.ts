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
  AuthResponseDto,
  UserResponseDto,
  VerifyOTPDto,
  InitiateOTPLoginDto,
  ResendOTPDto,
  OTPSentResponseDto,
  RegistrationPendingResponseDto,
} from './dto/register.dto';

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
  // REGISTRATION WITH OTP FLOW
  // ==========================================================================

  /**
   * Register new client - Step 1: Create account and send OTP
   */
  async registerClient(
    dto: RegisterClientDto,
  ): Promise<RegistrationPendingResponseDto> {
    const existing = await this.userService.findByEmail(dto.email);
    if (existing) {
      throw new AppError(
        ERROR_CODES.ALREADY_EXISTS,
        'User with this email already exists',
        { email: dto.email },
      );
    }

    try {
      // 1. Create user in Supabase (NOT confirmed, OTP will be sent)
      const supabaseUser = await this.supabaseService.createUser(
        dto.email,
        dto.password,
        { name: dto.organizationName },
      );

      // 2. Send OTP for verification
      await this.supabaseService.sendOTP(dto.email, 'signup');

      // 3. Create user + client profile in database (but mark as unverified)
      const { user } = await this.userService.createClient(
        {
          id: supabaseUser.id,
          email: dto.email,
          name: dto.organizationName,
          role: 'client',
          emailVerified: false, // ✅ Not verified until OTP is confirmed
        },
        {
          organizationName: dto.organizationName,
          industry: dto.industry,
          orgDocumentUrl: dto.orgDocumentUrl,
        },
      );

      await this.notificationService.push({
        type: NotificationType.INFO,
        message:
          'Account created! Please check your email for the verification code.',
        context: { userId: user.id, email: user.email },
      });

      this.logger.log(`Client registration pending OTP: ${user.email}`);

      return {
        message: 'Account created. Please verify your email with the OTP sent.',
        email: user.email,
        userId: user.id,
        otpSent: true,
      };
    } catch (error) {
      this.logger.error('Client registration failed:', error);
      throw this.handleSupabaseError(error, 'Registration failed');
    }
  }

  /**
   * Verify OTP after registration - Step 2: Complete registration
   */
  async verifyRegistrationOTP(dto: VerifyOTPDto): Promise<AuthResponseDto> {
    try {
      // 1. Verify OTP with Supabase (this creates the session)
      const { session, user: supabaseUser } =
        await this.supabaseService.verifyOTP(dto.email, dto.token);

      if (!session || !supabaseUser) {
        throw new Error('OTP verification failed');
      }

      // 2. Update user in our database as verified
      const user = await this.userService.findById(supabaseUser.id);
      if (!user) {
        throw new AppError(ERROR_CODES.RESOURCE_NOT_FOUND, 'User not found');
      }

      // Mark email as verified
      await this.userService.updateUser(user.id, { emailVerified: true });

      // 3. Get user profile
      const { profile } = await this.userService.getUserWithProfile(user.id);
      const orgId = this.getOrgId(user.role, profile);

      // 4. Populate context
      this.contextService.setMeta({
        userId: user.id,
        username: user.name || user.email.split('@')[0],
        email: user.email,
        orgId,
        correlationId: uuidv4(),
        timestamp: new Date(),
      });

      // 5. Send success notification
      await this.notificationService.push({
        type: NotificationType.SUCCESS,
        message: 'Email verified successfully! Welcome to Gradlinq.',
        context: { userId: user.id, role: user.role },
      });

      this.logger.log(`Registration completed for: ${user.email}`);

      // Map user response with the updated email verification status
      const updatedUser = await this.userService.updateUser(user.id, {
        emailVerified: true,
      });

      return {
        user: this.mapUserResponse(updatedUser),
        session: {
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
          expiresAt: session.expires_at!,
        },
        profile: this.mapProfile(updatedUser.role, profile),
      };
    } catch (error) {
      this.logger.error('OTP verification failed:', error);
      throw this.handleSupabaseError(error, 'Invalid or expired OTP');
    }
  }

  /**
   * Register supervisor with OTP
   */
  async registerSupervisor(
    dto: RegisterSupervisorDto,
  ): Promise<RegistrationPendingResponseDto> {
    const existing = await this.userService.findByEmail(dto.email);
    if (existing) {
      throw new AppError(ERROR_CODES.ALREADY_EXISTS, 'User already exists');
    }

    try {
      const supabaseUser = await this.supabaseService.createUser(
        dto.email,
        dto.password,
      );
      await this.supabaseService.sendOTP(dto.email, 'signup');

      const { user } = await this.userService.createSupervisor(
        {
          id: supabaseUser.id,
          email: dto.email,
          role: 'supervisor',
          emailVerified: false,
        },
        {
          universityId: dto.universityId,
          employmentDocumentUrl: dto.employmentDocumentUrl,
        },
      );

      this.logger.log(`Supervisor registration pending OTP: ${user.email}`);

      return {
        message: 'Account created. Please verify your email with the OTP sent.',
        email: user.email,
        userId: user.id,
        otpSent: true,
      };
    } catch (error) {
      throw this.handleSupabaseError(error, 'Registration failed');
    }
  }

  /**
   * Register student with OTP
   */
  async registerStudent(
    dto: RegisterStudentDto,
  ): Promise<RegistrationPendingResponseDto> {
    const existing = await this.userService.findByEmail(dto.email);
    if (existing) {
      throw new AppError(ERROR_CODES.ALREADY_EXISTS, 'User already exists');
    }

    try {
      const supabaseUser = await this.supabaseService.createUser(
        dto.email,
        dto.password,
        { name: dto.matricNumber },
      );
      await this.supabaseService.sendOTP(dto.email, 'signup');

      const { user } = await this.userService.createStudent(
        {
          id: supabaseUser.id,
          email: dto.email,
          name: dto.matricNumber,
          role: 'student',
          emailVerified: false,
        },
        {
          matricNumber: dto.matricNumber,
          skills: dto.skills,
        },
      );

      this.logger.log(`Student registration pending OTP: ${user.email}`);

      return {
        message: 'Account created. Please verify your email with the OTP sent.',
        email: user.email,
        userId: user.id,
        otpSent: true,
      };
    } catch (error) {
      throw this.handleSupabaseError(error, 'Registration failed');
    }
  }

  /**
   * Register university with OTP
   */
  async registerUniversity(
    dto: RegisterUniversityDto,
  ): Promise<RegistrationPendingResponseDto> {
    const existing = await this.userService.findByEmail(dto.email);
    if (existing) {
      throw new AppError(ERROR_CODES.ALREADY_EXISTS, 'User already exists');
    }

    try {
      const supabaseUser = await this.supabaseService.createUser(
        dto.email,
        dto.password,
        { name: dto.name },
      );
      await this.supabaseService.sendOTP(dto.email, 'signup');

      const { user } = await this.userService.createUniversity(
        {
          id: supabaseUser.id,
          email: dto.email,
          name: dto.name,
          role: 'university',
          emailVerified: false,
        },
        {
          name: dto.name,
          location: dto.location,
          verificationDocumentUrl: dto.verificationDocumentUrl,
        },
      );

      this.logger.log(`University registration pending OTP: ${user.email}`);

      return {
        message: 'Account created. Please verify your email with the OTP sent.',
        email: user.email,
        userId: user.id,
        otpSent: true,
      };
    } catch (error) {
      throw this.handleSupabaseError(error, 'Registration failed');
    }
  }

  // ==========================================================================
  // LOGIN WITH OTP FLOW
  // ==========================================================================

  /**
   * Initiate login - Step 1: Send OTP
   */
  async initiateOTPLogin(
    dto: InitiateOTPLoginDto,
  ): Promise<OTPSentResponseDto> {
    try {
      // Verify user exists in our database
      const user = await this.userService.findByEmail(dto.email);
      if (!user) {
        throw new AppError(ERROR_CODES.RESOURCE_NOT_FOUND, 'User not found');
      }

      // Check if account is active
      if (!user.isActive) {
        throw new AppError(
          ERROR_CODES.OPERATION_NOT_ALLOWED,
          'Account is inactive',
        );
      }

      // Send OTP via Supabase
      await this.supabaseService.initiateOTPLogin(dto.email);

      await this.notificationService.push({
        type: NotificationType.INFO,
        message: 'OTP sent to your email. Please check your inbox.',
        context: { email: dto.email },
      });

      this.logger.log(`OTP login initiated for: ${dto.email}`);

      return {
        message: 'OTP sent successfully to your email',
        email: dto.email,
        expiresIn: 600, // 10 minutes
      };
    } catch (error) {
      this.logger.error('Failed to send OTP:', error);
      if (error instanceof AppError) throw error;
      throw new AppError(
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        'Failed to send OTP',
      );
    }
  }

  /**
   * Complete login - Step 2: Verify OTP
   */
  async verifyLoginOTP(dto: VerifyOTPDto): Promise<AuthResponseDto> {
    try {
      // 1. Verify OTP with Supabase
      const { session, user: supabaseUser } =
        await this.supabaseService.completeOTPLogin(dto.email, dto.token);

      if (!session || !supabaseUser) {
        throw new Error('OTP verification failed');
      }

      // 2. Get user from our database
      const user = await this.userService.findById(supabaseUser.id);
      if (!user) {
        throw new AppError(ERROR_CODES.RESOURCE_NOT_FOUND, 'User not found');
      }

      // 3. Check if account is active
      if (!user.isActive) {
        throw new AppError(
          ERROR_CODES.OPERATION_NOT_ALLOWED,
          'Account is inactive',
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
        context: { userId: user.id, role: user.role },
      });

      this.logger.log(`User logged in via OTP: ${user.email}`);

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
      this.logger.error('OTP login failed:', error);
      await this.notificationService.push({
        type: NotificationType.ERROR,
        message: 'Login failed. Invalid or expired OTP.',
        context: { email: dto.email },
      });
      throw this.handleSupabaseError(error, 'Invalid or expired OTP');
    }
  }

  /**
   * Resend OTP
   */
  async resendOTP(dto: ResendOTPDto): Promise<OTPSentResponseDto> {
    try {
      await this.supabaseService.resendOTP(dto.email);

      await this.notificationService.push({
        type: NotificationType.INFO,
        message: 'New OTP sent to your email.',
        context: { email: dto.email },
      });

      this.logger.log(`OTP resent to: ${dto.email}`);

      return {
        message: 'OTP sent successfully to your email',
        email: dto.email,
        expiresIn: 600,
      };
    } catch (error) {
      this.logger.error('Failed to resend OTP:', error);
      throw new AppError(
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        'Failed to resend OTP',
      );
    }
  }

  // ==========================================================================
  // OTHER AUTH METHODS (Unchanged)
  // ==========================================================================

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

  async refreshToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
  }> {
    try {
      const { session } =
        await this.supabaseService.refreshSession(refreshToken);
      if (!session) throw new Error('Failed to refresh session');

      return {
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        expiresAt: session.expires_at!,
      };
    } catch {
      throw new AppError(
        ERROR_CODES.UNAUTHORIZED,
        'Invalid or expired refresh token',
      );
    }
  }

  async verifySession(accessToken: string): Promise<{
    user: UserResponseDto;
    profile: ProfileResponse | undefined;
  }> {
    try {
      const supabaseUser = await this.supabaseService.verifyToken(accessToken);
      const user = await this.userService.findById(supabaseUser.id);

      if (!user) {
        throw new AppError(ERROR_CODES.RESOURCE_NOT_FOUND, 'User not found');
      }

      const { profile } = await this.userService.getUserWithProfile(user.id);

      return {
        user: this.mapUserResponse(user),
        profile: this.mapProfile(user.role, profile),
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
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
    const err = error as Error & { message?: string; status?: number };

    if (err.message?.includes('already registered')) {
      return new AppError(
        ERROR_CODES.ALREADY_EXISTS,
        'Email already registered',
      );
    }
    if (err.message?.includes('Invalid') || err.message?.includes('expired')) {
      return new AppError(
        ERROR_CODES.INVALID_CREDENTIALS,
        'Invalid or expired OTP',
      );
    }
    if (error instanceof AppError) return error;

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
