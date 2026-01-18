// ============================================================================
// FIXED: Roles Guard - Works with BOTH GraphQL and HTTP
// src/modules/core/auth/guards/roles.guard.ts
// ============================================================================

import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Request } from 'express';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { UserRole } from '../models/user.model';
import { ERROR_CODES } from '@shared/error/constants/error-codes.constant';
import { AppError } from '@shared/error/classes/app-error.class';
import { NotificationService } from '@shared/notification/notification.service';
import { NotificationType } from '@shared/notification/interfaces';
import { Logger } from '@nestjs/common';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(
    private reflector: Reflector,
    private notificationService: NotificationService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    // Check if route is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Get required roles from @Roles() decorator
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No roles required - allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // ✅ FIX: Get request from EITHER HTTP or GraphQL context
    const request = this.getRequest(context);
    const user = request.user;

    if (!user) {
      this.logger.error('RolesGuard: User not found in request');
      throw new AppError(ERROR_CODES.UNAUTHORIZED, 'User not authenticated');
    }

    // Check if user has required role
    const hasRole = requiredRoles.includes(user.role);

    if (!hasRole) {
      this.logger.warn(
        `Access denied: User ${user.email} (${user.role}) attempted to access route requiring [${requiredRoles.join(', ')}]`,
      );

      this.notificationService
        .push({
          type: NotificationType.ERROR,
          message: 'Access denied. Insufficient permissions.',
          context: {
            userId: user.id,
            userRole: user.role,
            requiredRoles,
          },
        })
        .catch(() => {});

      throw new AppError(
        ERROR_CODES.INSUFFICIENT_PERMISSIONS,
        `Access denied. Required role: ${requiredRoles.join(' or ')}`,
        {
          requiredRoles,
          userRole: user.role,
        },
      );
    }

    this.logger.debug(
      `Access granted: User ${user.email} (${user.role}) has required role`,
    );
    return true;
  }

  /**
   * ✅ NEW: Extract request from EITHER HTTP or GraphQL context
   */
  private getRequest(context: ExecutionContext): Request {
    const contextType = context.getType<string>();

    if (contextType === 'graphql') {
      const gqlContext = GqlExecutionContext.create(context);
      const ctx = gqlContext.getContext<{ req: Request }>();
      return ctx.req;
    }

    return context.switchToHttp().getRequest<Request>();
  }
}
