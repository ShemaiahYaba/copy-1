// ============================================================================
// src/modules/core/auth/decorators/roles.decorator.ts
// Type-Safe Roles Decorator
// ============================================================================

import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../models/user.model';

export const ROLES_KEY = 'roles';

/**
 * Restrict route access to specific roles
 *
 * @example
 * // Single role
 * @Roles('client')
 * @Post('create-project')
 * async createProject() { ... }
 *
 * // Multiple roles
 * @Roles('university', 'supervisor')
 * @Get('dashboard')
 * async getDashboard() { ... }
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
