// ============================================================================
// src/modules/core/auth/decorators/current-user.decorator.ts
// Type-Safe CurrentUser Decorator
// ============================================================================

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { User } from '../models/user.model';

/**
 * Extract the authenticated user from the request
 *
 * @example
 * // Get full user object
 * async getProfile(@CurrentUser() user: User) { ... }
 *
 * // Get specific property
 * async getEmail(@CurrentUser('email') email: string) { ... }
 *
 * // Get user ID
 * async update(@CurrentUser('id') userId: string) { ... }
 */
export const CurrentUser = createParamDecorator(
  (
    data: keyof User | undefined,
    ctx: ExecutionContext,
  ): User | string | undefined => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = request.user;

    if (!user) {
      return undefined;
    }

    // Return specific property if requested
    if (data) {
      return user[data] as string;
    }

    // Return full user object
    return user;
  },
);
