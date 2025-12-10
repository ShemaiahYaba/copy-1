// ============================================================================
// src/modules/core/auth/interfaces/auth.interface.ts
// Type-Safe Interfaces for Auth Module
// ============================================================================

import { User, UserRole } from '../models/user.model';
import { Request as ExpressRequest } from 'express';

/**
 * Extend Express Request to include authenticated user
 * This makes TypeScript aware of request.user
 */
// Extend Express Request type with user property
declare module 'express' {
  interface Request {
    user?: User;
  }
}

/**
 * Type-safe request with guaranteed user
 * Use this when you KNOW user is authenticated (after JwtAuthGuard)
 */
export interface AuthenticatedRequest extends ExpressRequest {
  user: User;
}

/**
 * JWT Payload from Supabase
 */
export interface SupabaseJwtPayload {
  sub: string; // User ID
  email?: string;
  aud: string;
  role?: string;
  iat: number;
  exp: number;
}

/**
 * Session data structure
 */
export interface SessionData {
  userId: string;
  userAgent?: string;
  ipAddress?: string;
  expiresAt: Date;
}

/**
 * Auth context for downstream services
 */
export interface AuthContext {
  userId: string;
  email: string;
  role: UserRole;
  orgId?: string;
  isActive: boolean;
}

/**
 * Token pair
 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

/**
 * Type guard to check if request has authenticated user
 */
export function isAuthenticatedRequest(
  request: ExpressRequest,
): request is AuthenticatedRequest {
  return request.user !== undefined;
}

/**
 * Type guard to check if user has specific role
 */
export function hasRole(user: User, roles: UserRole[]): boolean {
  return roles.includes(user.role);
}

/**
 * Type guard to check if user is active
 */
export function isActiveUser(user: User): boolean {
  return user.isActive === true;
}
