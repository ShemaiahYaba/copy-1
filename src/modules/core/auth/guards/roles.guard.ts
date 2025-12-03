// ============================================================================
// src/modules/auth/guards/roles.guard.ts
// ============================================================================

import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../models/user.model';
import { ERROR_CODES } from '@shared/error/constants/error-codes.constant';
import { AppError } from '@shared/error/classes/app-error.class';
import { NotificationService } from '@shared/notification/notification.service';
import { NotificationType } from '@shared/notification/interfaces';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private notificationService: NotificationService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throw new AppError(ERROR_CODES.UNAUTHORIZED, 'User not authenticated');
    }

    const hasRole = requiredRoles.includes(user.role);

    if (!hasRole) {
      // Send notification for forbidden access
      this.notificationService
        .push({
          type: NotificationType.ERROR,
          message: 'Access denied. Insufficient permissions.',
          context: {
            userId: user.id,
            requiredRoles,
            userRole: user.role,
          },
        })
        .catch(() => {
          // Ignore notification errors
        });

      throw new AppError(
        ERROR_CODES.INSUFFICIENT_PERMISSIONS,
        'Access denied. Insufficient permissions.',
        {
          requiredRoles,
          userRole: user.role,
        },
      );
    }

    return true;
  }
}
