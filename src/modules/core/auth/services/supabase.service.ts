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

    this.supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    this.logger.log('Supabase service initialized');
  }

  getClient(): SupabaseClient<any, any> {
    return this.supabase;
  }

  // ==========================================================================
  // USER MANAGEMENT WITH OTP
  // ==========================================================================

  /**
   * Create new user - OTP will be sent automatically by Supabase
   * Note: User account is created but not confirmed until OTP is verified
   */
  async createUser(
    email: string,
    password: string,
    metadata?: { name?: string },
  ): Promise<User> {
    try {
      // Create user WITHOUT auto-confirmation (email_confirm: false)
      const { data, error } = await this.supabase.auth.admin.createUser({
        email,
        password,
        user_metadata: metadata || {},
        email_confirm: false, // ✅ Changed: Don't auto-confirm, require OTP
      });

      if (error) {
        this.logger.error('Failed to create user:', error);
        throw error;
      }

      this.logger.log(`User created (pending OTP verification): ${email}`);
      return data.user;
    } catch (error) {
      this.logger.error('Error creating user:', error);
      throw error;
    }
  }

  // ==========================================================================
  // OTP METHODS
  // ==========================================================================

  /**
   * Send OTP to user's email
   * @param email - User's email address
   * @param type - Type of OTP (e.g., 'signup', 'login', 'recovery')
   */
  async sendOTP(
    email: string,
    type: 'signup' | 'login' | 'recovery' = 'signup',
  ): Promise<void> {
    try {
      const { error } = await this.supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${process.env.FRONTEND_URL}/auth/callback`,
        },
      });

      if (error) {
        this.logger.error('Failed to send OTP:', error);
        throw error;
      }

      this.logger.log(`OTP sent to ${email} for ${type}`);
    } catch (error) {
      this.logger.error('Error sending OTP:', error);
      throw new Error('Failed to send OTP. Please try again later.');
    }
  }

  /**
   * Verify OTP and create session
   * Returns user and session if OTP is valid
   */
  async verifyOTP(email: string, token: string) {
    try {
      const { data, error } = await this.supabase.auth.verifyOtp({
        email,
        token,
        type: 'email', // or 'magiclink' depending on your flow
      });

      if (error) {
        this.logger.error('OTP verification failed:', error);
        throw error;
      }

      if (!data.session || !data.user) {
        throw new Error('Invalid OTP or session creation failed');
      }

      this.logger.log(`OTP verified for: ${email}`);
      return data; // Returns { user, session }
    } catch (error) {
      this.logger.error('Error verifying OTP:', error);
      throw error;
    }
  }

  /**
   * Resend OTP (for when user doesn't receive it)
   */
  async resendOTP(email: string): Promise<void> {
    try {
      const { error } = await this.supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (error) {
        this.logger.error('Failed to resend OTP:', error);
        throw error;
      }

      this.logger.log(`OTP resent to: ${email}`);
    } catch (error) {
      this.logger.error('Error resending OTP:', error);
      throw error;
    }
  }

  // ==========================================================================
  // AUTHENTICATION (UPDATED FOR OTP FLOW)
  // ==========================================================================

  /**
   * Initiate login by sending OTP
   * Replaces signInWithPassword for OTP-based auth
   */
  async initiateOTPLogin(email: string): Promise<void> {
    try {
      const { error } = await this.supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false, // Only allow existing users to login
        },
      });

      if (error) {
        this.logger.error('Failed to initiate OTP login:', error);
        throw error;
      }

      this.logger.log(`OTP login initiated for: ${email}`);
    } catch (error) {
      this.logger.error('Error initiating OTP login:', error);
      throw error;
    }
  }

  /**
   * Complete login by verifying OTP
   */
  async completeOTPLogin(email: string, token: string) {
    return this.verifyOTP(email, token);
  }

  /**
   * LEGACY: Keep password-based signin for backward compatibility
   * You can remove this if going fully OTP-only
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
      return data;
    } catch (error) {
      this.logger.error('Error signing in:', error);
      throw error;
    }
  }

  async signOut(accessToken: string): Promise<void> {
    try {
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
      return data;
    } catch (error) {
      this.logger.error('Error refreshing session:', error);
      throw error;
    }
  }

  // ==========================================================================
  // USER UPDATES
  // ==========================================================================

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
  // PASSWORD RECOVERY (Now uses OTP)
  // ==========================================================================

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
}
