// ============================================================================
// src/modules/core/auth/guards/roles.guard.ts
// Type-Safe Role-Based Access Control Guard
// ============================================================================

import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ROLES_KEY } from '../decorators/roles.decorator';
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
    // 1. Get required roles from @Roles() decorator
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // 2. No roles required - allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // 3. Get user from request (attached by JwtAuthGuard)
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user;

    if (!user) {
      this.logger.error('RolesGuard: User not found in request');
      throw new AppError(ERROR_CODES.UNAUTHORIZED, 'User not authenticated');
    }

    // 4. Check if user has required role
    const hasRole = requiredRoles.includes(user.role);

    if (!hasRole) {
      this.logger.warn(
        `Access denied: User ${user.email} (${user.role}) attempted to access route requiring [${requiredRoles.join(', ')}]`,
      );

      // Send notification for forbidden access
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
        .catch(() => {
          // Ignore notification errors
        });

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
}
