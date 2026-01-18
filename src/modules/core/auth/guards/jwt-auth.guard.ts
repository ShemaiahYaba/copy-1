// ============================================================================
// PRODUCTION-READY: JWT Auth Guard - Works with BOTH GraphQL and HTTP
// src/modules/core/auth/guards/jwt-auth.guard.ts
// ============================================================================

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { SupabaseService } from '../services/supabase.service';
import { UserService } from '../services/user.service';
import { NotificationService } from '@shared/notification/notification.service';
import { NotificationType } from '@shared/notification/interfaces';
import { User } from '../models/user.model';

// Extend Express Request to include user
declare module 'express' {
  interface Request {
    user?: User;
  }
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private reflector: Reflector,
    private supabaseService: SupabaseService,
    private userService: UserService,
    private notificationService: NotificationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const handler = context.getHandler();
    const controller = context.getClass();

    // ✅ FIX 1: Get request from EITHER HTTP or GraphQL context
    const request = this.getRequest(context);

    this.logger.debug(
      `JwtAuthGuard checking: ${controller.name} -> ${handler.name} (Path: ${request.url})`,
    );

    // 1. Check if route is marked as @Public()
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      handler,
      controller,
    ]);

    this.logger.debug(
      `JwtAuthGuard: isPublic flag for ${request.url} = ${isPublic}`,
    );

    if (isPublic) {
      this.logger.debug(
        `JwtAuthGuard: Allowing public access to ${request.url}`,
      );
      return true;
    }

    const token = this.extractTokenFromHeader(request);

    // 2. No token provided
    if (!token) {
      this.logger.warn('No authorization token provided');
      throw new UnauthorizedException('No authorization token provided');
    }

    try {
      // 3. Verify token with Supabase (they do all the JWT validation)
      const supabaseUser = await this.supabaseService.verifyToken(token);

      // 4. Get user from OUR database (with role, profile, etc.)
      const user = await this.userService.findById(supabaseUser.id);

      if (!user) {
        this.logger.warn(`User not found in database: ${supabaseUser.id}`);
        throw new UnauthorizedException('User not found');
      }

      // 5. Check if account is active
      if (!user.isActive) {
        this.logger.warn(`Inactive account attempted access: ${user.id}`);
        throw new UnauthorizedException('Account is inactive');
      }

      // 6. Attach user to request for downstream use
      request.user = user;

      this.logger.debug(`User authenticated: ${user.email} (${user.role})`);
      return true;
    } catch (error) {
      this.logger.error('Authentication failed:', error);

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      // Send notification (optional)
      this.notificationService
        .push({
          type: NotificationType.ERROR,
          message: 'Authentication failed. Please log in again.',
          context: { reason: errorMessage },
        })
        .catch(() => {
          // Ignore notification errors
        });

      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  /**
   * ✅ FIX 2: Extract request from EITHER HTTP or GraphQL context
   * This is the CRITICAL method that was missing GraphQL support
   */
  private getRequest(context: ExecutionContext): Request {
    // Check if this is a GraphQL request
    const contextType = context.getType<string>();

    if (contextType === 'graphql') {
      // GraphQL request - get request from GQL context
      const gqlContext = GqlExecutionContext.create(context);
      const ctx = gqlContext.getContext<{ req: Request }>();
      return ctx.req;
    }

    // HTTP request - standard approach
    return context.switchToHttp().getRequest<Request>();
  }

  /**
   * Extract Bearer token from Authorization header
   */
  private extractTokenFromHeader(request: Request): string | undefined {
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      return undefined;
    }

    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}
