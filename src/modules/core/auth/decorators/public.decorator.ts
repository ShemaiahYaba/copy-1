// ============================================================================
// src/modules/core/auth/decorators/public.decorator.ts
// Mark routes as public (bypass authentication)
// ============================================================================

import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Mark a route as public (no authentication required)
 *
 * @example
 * @Public()
 * @Post('login')
 * async login(@Body() dto: LoginDto) { ... }
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
