// src/modules/auth/auth.module.ts
import { Module } from '@nestjs/common';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

// Services
import { AppwriteService } from './services/appwrite.service';
import { UserService } from './services/user.service';

// ✅ ADD THESE IMPORTS
import { DatabaseModule } from '@database/database.module';
import { ContextModule } from '@shared/context/context.module';
import { NotificationModule } from '@shared/notification/notification.module';

@Module({
  imports: [
    // ✅ ADD THESE THREE LINES
    DatabaseModule,
    ContextModule.register(),
    NotificationModule.register(),
  ],
  controllers: [AuthController],
  providers: [AuthService, AppwriteService, UserService],
  exports: [AuthService, AppwriteService, UserService],
})
export class AuthModule {}
