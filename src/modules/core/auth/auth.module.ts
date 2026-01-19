// ============================================================================
// src/modules/core/auth/auth.module.ts
// Updated for Supabase (No Passport Required)
// ============================================================================

import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

// Services
import { SupabaseService } from './services/supabase.service';
import { UserService } from './services/user.service';

// Guards (No Passport!)
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

// Module Imports
import { DatabaseModule } from '@database/database.module';
import { ContextModule } from '@shared/context/context.module';

@Module({
  imports: [
    DatabaseModule,
    ContextModule.register(),
  ],
  controllers: [AuthController],
  providers: [
    // Core services
    AuthService,
    SupabaseService,
    UserService,

    // Guards as providers (for dependency injection)
    JwtAuthGuard,
    RolesGuard,

    // ✅ OPTION 1: Apply JwtAuthGuard globally to all routes
    // This makes ALL routes protected by default
    // Use @Public() decorator to make specific routes public
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },

    // ✅ Apply RolesGuard globally (runs after JwtAuthGuard)
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
  exports: [
    AuthService,
    SupabaseService,
    UserService,
    JwtAuthGuard,
    RolesGuard,
  ],
})
export class AuthModule {}

// ============================================================================
// IMPORTANT NOTES:
// ============================================================================
//
// With APP_GUARD configuration above:
// - ALL routes are protected by default
// - Use @Public() decorator to bypass authentication
// - Use @Roles('client', 'supervisor') to restrict by role
//
// Example usage in controllers:
//
// @Controller('projects')
// export class ProjectController {
//
//   @Get()  // ← Protected (requires authentication)
//   async getProjects() { }
//
//   @Get('public')
//   @Public()  // ← Public (no authentication required)
//   async getPublicProjects() { }
//
//   @Post()
//   @Roles('client')  // ← Protected + requires 'client' role
//   async createProject() { }
// }
//
// ============================================================================
