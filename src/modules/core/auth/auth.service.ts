// src/modules/auth/auth.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { ERROR_CODES } from '@shared/error/constants/error-codes.constant';
import { AppError } from '@shared/error/classes/app-error.class';
import { ContextService } from '@shared/context/context.service';
import { NotificationService } from '@shared/notification/notification.service';
import { NotificationType } from '@shared/notification/interfaces';

import { AppwriteService } from './services/appwrite.service';
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

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private appwriteService: AppwriteService,
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
      // Create Appwrite account
      const appwriteUser = await this.appwriteService.createAccount(
        dto.email,
        dto.password,
        dto.organizationName,
      );

      // Create session in Appwrite
      const session = await this.appwriteService.createEmailSession(
        dto.email,
        dto.password,
      );

      // Create user + client profile in our database
      const { user, client } = await this.userService.createClient(
        {
          id: appwriteUser.$id,
          appwriteId: appwriteUser.$id,
          email: dto.email,
          name: dto.organizationName,
          role: 'client',
          emailVerified: appwriteUser.emailVerification,
        },
        {
          organizationName: dto.organizationName,
          industry: dto.industry,
          orgDocumentUrl: dto.orgDocumentUrl,
        },
      );

      // Populate context
      this.contextService.setMeta({
        userId: user.id,
        username: user.name || user.email.split('@')[0],
        email: user.email,
        orgId: client.id,
        correlationId: uuidv4(),
        timestamp: new Date(),
      });

      // Send success notification
      await this.notificationService.push({
        type: NotificationType.SUCCESS,
        message: 'Account created successfully! Welcome to Gradlinq.',
        context: { userId: user.id, role: user.role },
      });

      this.logger.log(`Client registered: ${user.email}`);

      return {
        user: this.mapUserResponse(user),
        session: {
          sessionId: session.$id,
          userId: session.userId,
          expire: session.expire,
        },
        profile: {
          id: client.id,
          organizationName: client.organizationName,
          industry: client.industry || undefined,
        },
      };
    } catch (error: any) {
      this.logger.error('Client registration failed:', error);

      // Handle Appwrite-specific errors
      if (error.code === 409) {
        throw new AppError(
          ERROR_CODES.ALREADY_EXISTS,
          'Email already registered in authentication system',
          { email: dto.email },
        );
      }

      throw new AppError(
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        'Registration failed',
        { error: error.message },
      );
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
      const appwriteUser = await this.appwriteService.createAccount(
        dto.email,
        dto.password,
      );

      const session = await this.appwriteService.createEmailSession(
        dto.email,
        dto.password,
      );

      const { user, supervisor } = await this.userService.createSupervisor(
        {
          id: appwriteUser.$id,
          appwriteId: appwriteUser.$id,
          email: dto.email,
          role: 'supervisor',
          emailVerified: appwriteUser.emailVerification,
        },
        {
          universityId: dto.universityId,
          employmentDocumentUrl: dto.employmentDocumentUrl,
        },
      );

      this.contextService.setMeta({
        userId: user.id,
        email: user.email,
        orgId: supervisor.universityId,
        correlationId: uuidv4(),
        timestamp: new Date(),
      });

      await this.notificationService.push({
        type: NotificationType.SUCCESS,
        message: 'Supervisor account created successfully!',
        context: { userId: user.id, role: user.role },
      });

      this.logger.log(`Supervisor registered: ${user.email}`);

      return {
        user: this.mapUserResponse(user),
        session: {
          sessionId: session.$id,
          userId: session.userId,
          expire: session.expire,
        },
        profile: {
          id: supervisor.id,
          universityId: supervisor.universityId,
          employmentStatus: supervisor.employmentStatus,
        },
      };
    } catch (error: any) {
      this.logger.error('Supervisor registration failed:', error);
      // FIX: Re-throw AppError instances directly
      if (error instanceof AppError) {
        throw error;
      }
      throw this.handleAppwriteError(error, 'Registration failed');
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
      const appwriteUser = await this.appwriteService.createAccount(
        dto.email,
        dto.password,
        dto.matricNumber,
      );

      const session = await this.appwriteService.createEmailSession(
        dto.email,
        dto.password,
      );

      const { user, student } = await this.userService.createStudent(
        {
          id: appwriteUser.$id,
          appwriteId: appwriteUser.$id,
          email: dto.email,
          name: dto.matricNumber,
          role: 'student',
          emailVerified: appwriteUser.emailVerification,
        },
        {
          matricNumber: dto.matricNumber,
          skills: dto.skills,
        },
      );

      this.contextService.setMeta({
        userId: user.id,
        email: user.email,
        correlationId: uuidv4(),
        timestamp: new Date(),
      });

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
          sessionId: session.$id,
          userId: session.userId,
          expire: session.expire,
        },
        profile: {
          id: student.id,
          matricNumber: student.matricNumber,
          graduationStatus: student.graduationStatus,
          skills: student.skills || undefined,
        },
      };
    } catch (error: any) {
      this.logger.error('Student registration failed:', error);
      throw this.handleAppwriteError(error, 'Registration failed');
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
      const appwriteUser = await this.appwriteService.createAccount(
        dto.email,
        dto.password,
        dto.name,
      );

      const session = await this.appwriteService.createEmailSession(
        dto.email,
        dto.password,
      );

      const { user, university } = await this.userService.createUniversity(
        {
          id: appwriteUser.$id,
          appwriteId: appwriteUser.$id,
          email: dto.email,
          name: dto.name,
          role: 'university',
          emailVerified: appwriteUser.emailVerification,
        },
        {
          name: dto.name,
          location: dto.location,
          verificationDocumentUrl: dto.verificationDocumentUrl,
        },
      );

      this.contextService.setMeta({
        userId: user.id,
        email: user.email,
        orgId: university.id,
        correlationId: uuidv4(),
        timestamp: new Date(),
      });

      await this.notificationService.push({
        type: NotificationType.SUCCESS,
        message: 'University account created successfully!',
        context: { userId: user.id, role: user.role },
      });

      this.logger.log(`University registered: ${user.email}`);

      return {
        user: this.mapUserResponse(user),
        session: {
          sessionId: session.$id,
          userId: session.userId,
          expire: session.expire,
        },
        profile: {
          id: university.id,
          name: university.name,
          location: university.location || undefined,
          isVerified: university.isVerified,
        },
      };
    } catch (error: any) {
      this.logger.error('University registration failed:', error);
      throw this.handleAppwriteError(error, 'Registration failed');
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
      // Create Appwrite session
      const session = await this.appwriteService.createEmailSession(
        dto.email,
        dto.password,
      );

      // Find user in our database
      let user = await this.userService.findByAppwriteId(session.userId);

      if (!user) {
        // User exists in Appwrite but not in our DB (shouldn't happen)
        throw new AppError(
          ERROR_CODES.RESOURCE_NOT_FOUND,
          'User profile not found',
          { appwriteId: session.userId },
        );
      }

      // Check if account is active
      if (!user.isActive) {
        await this.appwriteService.deleteSession(session.$id);
        throw new AppError(
          ERROR_CODES.OPERATION_NOT_ALLOWED,
          'Account is inactive',
          { userId: user.id },
        );
      }

      // Get user profile
      const { profile } = await this.userService.getUserWithProfile(user.id);
      const orgId = this.getOrgId(user.role, profile);

      // Populate context
      this.contextService.setMeta({
        userId: user.id,
        username: user.name || user.email.split('@')[0],
        email: user.email,
        orgId,
        correlationId: uuidv4(),
        timestamp: new Date(),
      });

      // Send welcome notification
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
          sessionId: session.$id,
          userId: session.userId,
          expire: session.expire,
        },
        profile: this.mapProfile(user.role, profile),
      };
    } catch (error: any) {
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
  async logout(sessionId: string, userId?: string): Promise<void> {
    try {
      await this.appwriteService.deleteSession(sessionId);

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
   * Get current session
   */
  async getCurrentSession(sessionId: string) {
    try {
      return await this.appwriteService.getSession(sessionId);
    } catch (error) {
      throw new AppError(
        ERROR_CODES.UNAUTHORIZED,
        'Invalid or expired session',
      );
    }
  }

  /**
   * Verify session and get user
   */
  async verifySession(sessionId: string): Promise<any> {
    try {
      const session = await this.appwriteService.getSession(sessionId);
      const user = await this.userService.findByAppwriteId(session.userId);

      if (!user) {
        throw new AppError(ERROR_CODES.RESOURCE_NOT_FOUND, 'User not found');
      }

      return { user, session };
    } catch (error) {
      if (error instanceof AppError) {
        // Let our custom errors pass through
        throw error;
      }
      throw new AppError(
        ERROR_CODES.UNAUTHORIZED,
        'Invalid or expired session',
      );
    }
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  private handleAppwriteError(error: any, defaultMessage: string): AppError {
    if (error.code === 409) {
      return new AppError(
        ERROR_CODES.ALREADY_EXISTS,
        'Email already registered',
      );
    }

    if (error.code === 401) {
      return new AppError(
        ERROR_CODES.INVALID_CREDENTIALS,
        'Invalid credentials',
      );
    }

    return new AppError(ERROR_CODES.INTERNAL_SERVER_ERROR, defaultMessage, {
      error: error.message,
    });
  }

  private getOrgId(role: string, profile: any): string | undefined {
    switch (role) {
      case 'client':
        return profile?.id;
      case 'supervisor':
      case 'university':
        return profile?.universityId || profile?.id;
      default:
        return undefined;
    }
  }

  private mapUserResponse(user: any): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }

  private mapProfile(role: string, profile: any): any {
    if (!profile) return undefined;

    switch (role) {
      case 'client':
        return {
          id: profile.id,
          organizationName: profile.organizationName,
          industry: profile.industry,
        };
      case 'supervisor':
        return {
          id: profile.id,
          universityId: profile.universityId,
          employmentStatus: profile.employmentStatus,
        };
      case 'student':
        return {
          id: profile.id,
          matricNumber: profile.matricNumber,
          graduationStatus: profile.graduationStatus,
          skills: profile.skills,
        };
      case 'university':
        return {
          id: profile.id,
          name: profile.name,
          location: profile.location,
          isVerified: profile.isVerified,
        };
      default:
        return profile;
    }
  }
}
