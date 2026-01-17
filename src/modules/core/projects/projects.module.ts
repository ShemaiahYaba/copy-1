// ============================================================================
// FIXED: src/modules/core/projects/projects.module.ts
// ============================================================================

import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsResolver } from './projects.resolver';
import { DatabaseModule } from '@database/database.module';
import { ContextModule } from '@modules/shared/context/context.module';
import { NotificationModule } from '@modules/shared/notification/notification.module';
import { NotificationAdapter } from '@modules/shared/notification/dto';
import { AuthModule } from '@modules/core/auth/auth.module';

@Module({
  imports: [
    DatabaseModule,
    ContextModule,
    AuthModule,
    // ✅ FIXED: Call register() to properly initialize NotificationModule
    NotificationModule.register({
      adapter: NotificationAdapter.WEBSOCKET,
      persist: false,
      enableLogging: true,
      maxRetries: 3,
    }),
  ],
  providers: [ProjectsService, ProjectsResolver],
  exports: [ProjectsService],
})
export class ProjectsModule {}
