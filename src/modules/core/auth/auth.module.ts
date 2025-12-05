// src/modules/auth/auth.module.ts
import { Module } from '@nestjs/common';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

// Services
import { SupabaseService } from './services/supabase.service';
import { UserService } from './services/user.service';

import { DatabaseModule } from '@database/database.module';
import { ContextModule } from '@shared/context/context.module';
import { NotificationModule } from '@shared/notification/notification.module';

@Module({
  imports: [
    DatabaseModule,
    ContextModule.register(),
    NotificationModule.register(),
  ],
  controllers: [AuthController],
  providers: [AuthService, SupabaseService, UserService],
  exports: [AuthService, SupabaseService, UserService],
})
export class AuthModule {}
