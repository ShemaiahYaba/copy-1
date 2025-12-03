// src/modules/auth/services/appwrite.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Client, Account, ID, Models } from 'node-appwrite';

@Injectable()
export class AppwriteService implements OnModuleInit {
  private readonly logger = new Logger(AppwriteService.name);
  private adminClient: Client;
  private adminAccount: Account;

  onModuleInit() {
    // Admin client for account creation (uses API key)
    this.adminClient = new Client()
      .setEndpoint(
        process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1',
      )
      .setProject(process.env.APPWRITE_PROJECT_ID || '');

    if (process.env.APPWRITE_API_KEY) {
      this.adminClient.setKey(process.env.APPWRITE_API_KEY);
    }

    this.adminAccount = new Account(this.adminClient);
    this.logger.log('Appwrite initialized');
  }

  /**
   * Create a session client for user-specific operations
   * This should be called for each request with the user's session
   */
  private createSessionClient(sessionId: string): {
    client: Client;
    account: Account;
  } {
    const client = new Client()
      .setEndpoint(
        process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1',
      )
      .setProject(process.env.APPWRITE_PROJECT_ID || '')
      .setSession(sessionId); // Set the user's session

    const account = new Account(client);
    return { client, account };
  }

  /**
   * Get Appwrite admin client for custom operations
   */
  getAdminClient(): Client {
    return this.adminClient;
  }

  /**
   * Get Admin Account service
   */
  getAdminAccount(): Account {
    return this.adminAccount;
  }

  /**
   * Create new Appwrite account
   * Uses ADMIN client (API key) - doesn't need session
   */
  async createAccount(
    email: string,
    password: string,
    name?: string,
  ): Promise<Models.User<Models.Preferences>> {
    try {
      const userId = ID.unique();
      return await this.adminAccount.create(userId, email, password, name);
    } catch (error) {
      this.logger.error('Failed to create Appwrite account:', error);
      throw error;
    }
  }

  /**
   * Create email session (login)
   * Uses ADMIN client initially, returns session for future requests
   */
  async createEmailSession(
    email: string,
    password: string,
  ): Promise<Models.Session> {
    try {
      return await this.adminAccount.createEmailPasswordSession(
        email,
        password,
      );
    } catch (error) {
      this.logger.error('Failed to create email session:', error);
      throw error;
    }
  }

  /**
   * Get current session
   * Uses SESSION client (requires user's session ID)
   */
  async getSession(sessionId: string): Promise<Models.Session> {
    try {
      const { account } = this.createSessionClient(sessionId);
      // Get the current session using the session ID
      return await account.getSession(sessionId);
    } catch (error) {
      this.logger.error('Failed to get session:', error);
      throw error;
    }
  }

  /**
   * Delete session (logout)
   * Uses SESSION client (requires user's session ID)
   */
  async deleteSession(sessionId: string): Promise<void> {
    try {
      const { account } = this.createSessionClient(sessionId);
      await account.deleteSession(sessionId);
    } catch (error) {
      this.logger.error('Failed to delete session:', error);
      throw error;
    }
  }

  /**
   * Delete all sessions for a user
   * Uses SESSION client (requires user's session ID)
   */
  async deleteAllSessions(sessionId: string): Promise<void> {
    try {
      const { account } = this.createSessionClient(sessionId);
      await account.deleteSessions();
    } catch (error) {
      this.logger.error('Failed to delete all sessions:', error);
      throw error;
    }
  }

  /**
   * Get current user account details
   * Uses SESSION client (requires user's session ID)
   */
  async getCurrentUser(
    sessionId: string,
  ): Promise<Models.User<Models.Preferences>> {
    try {
      const { account } = this.createSessionClient(sessionId);
      return await account.get();
    } catch (error) {
      this.logger.error('Failed to get current user:', error);
      throw error;
    }
  }

  /**
   * Update account name
   * Uses SESSION client (requires user's session ID)
   */
  async updateName(
    sessionId: string,
    name: string,
  ): Promise<Models.User<Models.Preferences>> {
    try {
      const { account } = this.createSessionClient(sessionId);
      return await account.updateName(name);
    } catch (error) {
      this.logger.error('Failed to update name:', error);
      throw error;
    }
  }

  /**
   * Update account email
   * Uses SESSION client (requires user's session ID)
   */
  async updateEmail(
    sessionId: string,
    email: string,
    password: string,
  ): Promise<Models.User<Models.Preferences>> {
    try {
      const { account } = this.createSessionClient(sessionId);
      return await account.updateEmail(email, password);
    } catch (error) {
      this.logger.error('Failed to update email:', error);
      throw error;
    }
  }

  /**
   * Update account password
   * Uses SESSION client (requires user's session ID)
   */
  async updatePassword(
    sessionId: string,
    password: string,
    oldPassword: string,
  ): Promise<Models.User<Models.Preferences>> {
    try {
      const { account } = this.createSessionClient(sessionId);
      return await account.updatePassword(password, oldPassword);
    } catch (error) {
      this.logger.error('Failed to update password:', error);
      throw error;
    }
  }

  /**
   * Create password recovery
   * Uses ADMIN client (doesn't require session)
   */
  async createRecovery(email: string, url: string): Promise<Models.Token> {
    try {
      return await this.adminAccount.createRecovery(email, url);
    } catch (error) {
      this.logger.error('Failed to create recovery:', error);
      throw error;
    }
  }

  /**
   * Complete password recovery
   * Uses ADMIN client (doesn't require session)
   */
  async updateRecovery(
    userId: string,
    secret: string,
    password: string,
  ): Promise<Models.Token> {
    try {
      return await this.adminAccount.updateRecovery(userId, secret, password);
    } catch (error) {
      this.logger.error('Failed to update recovery:', error);
      throw error;
    }
  }

  /**
   * Create email verification
   * Uses SESSION client (requires user's session ID)
   */
  async createVerification(
    sessionId: string,
    url: string,
  ): Promise<Models.Token> {
    try {
      const { account } = this.createSessionClient(sessionId);
      return await account.createVerification(url);
    } catch (error) {
      this.logger.error('Failed to create verification:', error);
      throw error;
    }
  }

  /**
   * Complete email verification
   * Uses ADMIN client (doesn't require session)
   */
  async updateVerification(
    userId: string,
    secret: string,
  ): Promise<Models.Token> {
    try {
      return await this.adminAccount.updateVerification(userId, secret);
    } catch (error) {
      this.logger.error('Failed to update verification:', error);
      throw error;
    }
  }

  /**
   * Get user preferences
   * Uses SESSION client (requires user's session ID)
   */
  async getPreferences(sessionId: string): Promise<Models.Preferences> {
    try {
      const { account } = this.createSessionClient(sessionId);
      return await account.getPrefs();
    } catch (error) {
      this.logger.error('Failed to get preferences:', error);
      throw error;
    }
  }

  /**
   * Update user preferences
   * Uses SESSION client (requires user's session ID)
   */
  async updatePreferences(
    sessionId: string,
    prefs: object,
  ): Promise<Models.User<Models.Preferences>> {
    try {
      const { account } = this.createSessionClient(sessionId);
      return await account.updatePrefs(prefs);
    } catch (error) {
      this.logger.error('Failed to update preferences:', error);
      throw error;
    }
  }

  /**
   * Create JWT token for client-side auth
   * Uses SESSION client (requires user's session ID)
   */
  async createJWT(sessionId: string): Promise<Models.Jwt> {
    try {
      const { account } = this.createSessionClient(sessionId);
      return await account.createJWT();
    } catch (error) {
      this.logger.error('Failed to create JWT:', error);
      throw error;
    }
  }
}
