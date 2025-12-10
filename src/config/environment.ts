// src/config/environment.ts
import * as dotenv from 'dotenv';

export class EnvironmentConfig {
  static initialize(): void {
    // Load environment variables from .env file
    dotenv.config();
    // You could add more robust validation here if needed
    // e.g., check if required env vars like DATABASE_URL, JWT_SECRET are present
  }

  // Example helper if needed elsewhere
  static getPort(): number {
    const port = parseInt(process.env.PORT || '3000', 10);
    if (isNaN(port)) {
      throw new Error('PORT environment variable is not a valid number');
    }
    return port;
  }

  static getFrontendUrl(): string {
    return process.env.FRONTEND_URL || 'http://localhost:3000';
  }

  static getNodeEnv(): string {
    return process.env.NODE_ENV || 'development';
  }

  static isSentryEnabled(): boolean {
    return process.env.SENTRY_ENABLED === 'true';
  }

  // Add other getters for frequently used environment variables here
}
