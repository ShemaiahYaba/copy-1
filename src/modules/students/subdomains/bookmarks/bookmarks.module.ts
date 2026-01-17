// ============================================================================
// STUDENT BOOKMARKS MODULE
// src/modules/students/subdomains/bookmarks/bookmarks.module.ts
// ============================================================================

import { Module } from '@nestjs/common';
import { StudentBookmarksService } from './bookmarks.service';
import { StudentBookmarksResolver } from './bookmarks.resolver';
import { DatabaseModule } from '@database/database.module';
import { ProjectsModule } from '@modules/core/projects/projects.module';
import { ContextModule } from '@modules/shared/context/context.module';
import { NotificationModule } from '@modules/shared/notification/notification.module';
import { NotificationAdapter } from '@modules/shared/notification/dto';
import { AuthModule } from '@modules/core/auth/auth.module';

@Module({
  imports: [
    DatabaseModule,
    ProjectsModule,
    ContextModule,
    AuthModule,
    NotificationModule.register({
      adapter: NotificationAdapter.WEBSOCKET,
      persist: false,
      enableLogging: true,
      maxRetries: 3,
    }),
  ],
  providers: [StudentBookmarksService, StudentBookmarksResolver],
  exports: [StudentBookmarksService],
})
export class StudentBookmarksModule {}
