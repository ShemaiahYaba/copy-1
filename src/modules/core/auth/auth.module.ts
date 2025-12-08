// ============================================================================
// src/modules/core/auth/auth.module.ts
// Updated for Supabase (No Passport Required)
// ============================================================================

import { Module } from '@nestjs/common';

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
import { NotificationModule } from '@shared/notification/notification.module';

@Module({
  imports: [
    DatabaseModule,
    ContextModule.register(),
    NotificationModule.register(),
    // ❌ NO PassportModule
    // ❌ NO JwtModule
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

    // Optional: Apply JwtAuthGuard globally to all routes
    // Uncomment if you want all routes protected by default
    // {
    //   provide: APP_GUARD,
    //   useClass: JwtAuthGuard,
    // },
    // {
    //   provide: APP_GUARD,
    //   useClass: RolesGuard,
    // },
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
