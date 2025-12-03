// ============================================================================
// src/modules/auth/guards/jwt-auth.guard.ts
// ============================================================================

import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { NotificationService } from '@shared/notification/notification.service';
import { NotificationType } from '@shared/notification/interfaces';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private reflector: Reflector,
    private notificationService: NotificationService,
  ) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // Check if route is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (err || !user) {
      // Send notification for failed authentication
      this.notificationService
        .push({
          type: NotificationType.ERROR,
          message: 'Authentication failed. Please log in again.',
          context: { reason: info?.message || 'Token invalid or expired' },
        })
        .catch(() => {
          // Ignore notification errors
        });

      throw err || new UnauthorizedException('Authentication required');
    }

    return user;
  }
}
