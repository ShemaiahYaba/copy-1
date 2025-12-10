// src/modules/core/auth/services/supabase.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private readonly logger = new Logger(SupabaseService.name);
  private supabase!: SupabaseClient<any, any>;
  onModuleInit() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error(
        'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment variables',
      );
    }

    // Create Supabase client with service role (admin privileges)
    this.supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    this.logger.log('Supabase service initialized');
  }

  /**
   * Get Supabase client (for direct access if needed)
   */
  getClient(): SupabaseClient<any, any> {
    return this.supabase;
  }

  // ==========================================================================
  // USER MANAGEMENT (Admin Operations)
  // ==========================================================================

  /**
   * Create new user in Supabase Auth
   * Uses admin.createUser to bypass email confirmation for MVP
   */
  async createUser(
    email: string,
    password: string,
    metadata?: { name?: string },
  ): Promise<User> {
    try {
      const { data, error } = await this.supabase.auth.admin.createUser({
        email,
        password,
        user_metadata: metadata || {},
        email_confirm: true,
      });

      if (error) {
        this.logger.error('Failed to create user:', error);
        throw error;
      }

      this.logger.log(`User created: ${email}`);
      return data.user;
    } catch (error) {
      this.logger.error('Error creating user:', error);
      throw error;
    }
  }

  /**
   * Delete user from Supabase Auth (admin operation)
   */
  async deleteUser(userId: string): Promise<void> {
    try {
      const { error } = await this.supabase.auth.admin.deleteUser(userId);

      if (error) {
        this.logger.error('Failed to delete user:', error);
        throw error;
      }

      this.logger.log(`User deleted: ${userId}`);
    } catch (error) {
      this.logger.error('Error deleting user:', error);
      throw error;
    }
  }

  // ==========================================================================
  // AUTHENTICATION
  // ==========================================================================

  /**
   * Sign in with email and password
   * Returns session with access token and refresh token
   */
  async signInWithPassword(email: string, password: string) {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        this.logger.error('Sign in failed:', error);
        throw error;
      }

      this.logger.log(`User signed in: ${email}`);
      return data; // Returns { user, session }
    } catch (error) {
      this.logger.error('Error signing in:', error);
      throw error;
    }
  }

  /**
   * Sign out user (invalidate session)
   */
  async signOut(accessToken: string): Promise<void> {
    try {
      // Create a temporary client with the user's token
      const userClient = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_ANON_KEY!,
        {
          global: {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        },
      );

      const { error } = await userClient.auth.signOut();

      if (error) {
        this.logger.error('Sign out failed:', error);
        throw error;
      }

      this.logger.log('User signed out');
    } catch (error) {
      this.logger.error('Error signing out:', error);
      throw error;
    }
  }

  // ==========================================================================
  // TOKEN VERIFICATION
  // ==========================================================================

  /**
   * Verify access token and get user
   */
  async verifyToken(accessToken: string): Promise<User> {
    try {
      const { data, error } = await this.supabase.auth.getUser(accessToken);

      if (error) {
        this.logger.error('Token verification failed:', error);
        throw error;
      }

      if (!data.user) {
        throw new Error('User not found');
      }

      return data.user;
    } catch (error) {
      this.logger.error('Error verifying token:', error);
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshSession(refreshToken: string) {
    try {
      const { data, error } = await this.supabase.auth.refreshSession({
        refresh_token: refreshToken,
      });

      if (error) {
        this.logger.error('Session refresh failed:', error);
        throw error;
      }

      this.logger.log('Session refreshed');
      return data; // Returns { user, session }
    } catch (error) {
      this.logger.error('Error refreshing session:', error);
      throw error;
    }
  }

  // ==========================================================================
  // USER UPDATES (Admin Operations)
  // ==========================================================================

  /**
   * Update user email (admin operation)
   */
  async updateUserEmail(userId: string, newEmail: string): Promise<User> {
    try {
      const { data, error } = await this.supabase.auth.admin.updateUserById(
        userId,
        { email: newEmail },
      );

      if (error) {
        this.logger.error('Failed to update email:', error);
        throw error;
      }

      this.logger.log(`User email updated: ${userId}`);
      return data.user;
    } catch (error) {
      this.logger.error('Error updating email:', error);
      throw error;
    }
  }

  /**
   * Update user password (admin operation)
   */
  async updateUserPassword(userId: string, newPassword: string): Promise<User> {
    try {
      const { data, error } = await this.supabase.auth.admin.updateUserById(
        userId,
        { password: newPassword },
      );

      if (error) {
        this.logger.error('Failed to update password:', error);
        throw error;
      }

      this.logger.log(`User password updated: ${userId}`);
      return data.user;
    } catch (error) {
      this.logger.error('Error updating password:', error);
      throw error;
    }
  }

  /**
   * Update user metadata
   */
  async updateUserMetadata(
    userId: string,
    metadata: Record<string, any>,
  ): Promise<User> {
    try {
      const { data, error } = await this.supabase.auth.admin.updateUserById(
        userId,
        { user_metadata: metadata },
      );

      if (error) {
        this.logger.error('Failed to update metadata:', error);
        throw error;
      }

      this.logger.log(`User metadata updated: ${userId}`);
      return data.user;
    } catch (error) {
      this.logger.error('Error updating metadata:', error);
      throw error;
    }
  }

  // ==========================================================================
  // PASSWORD RECOVERY
  // ==========================================================================

  /**
   * Send password recovery email
   */
  async sendPasswordRecoveryEmail(email: string): Promise<void> {
    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.FRONTEND_URL}/auth/reset-password`,
      });

      if (error) {
        this.logger.error('Failed to send recovery email:', error);
        throw error;
      }

      this.logger.log(`Password recovery email sent to: ${email}`);
    } catch (error) {
      this.logger.error('Error sending recovery email:', error);
      throw error;
    }
  }

  // ==========================================================================
  // EMAIL VERIFICATION
  // ==========================================================================

  /**
   * Send email verification link
   */
  async sendVerificationEmail(email: string): Promise<void> {
    try {
      // Note: This requires the user to be authenticated
      // For admin operation, we auto-confirm during createUser
      const { error } = await this.supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (error) {
        this.logger.error('Failed to send verification email:', error);
        throw error;
      }

      this.logger.log(`Verification email sent to: ${email}`);
    } catch (error) {
      this.logger.error('Error sending verification email:', error);
      throw error;
    }
  }
}
