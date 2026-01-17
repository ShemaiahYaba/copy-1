// ============================================================================
// STUDENTS MODULE (Parent Domain Module)
// src/modules/students/students.module.ts
// ============================================================================

import { Module } from '@nestjs/common';
import { StudentsService } from './students.service';
import { StudentsResolver } from './students.resolver';
import { ContextModule } from '@modules/shared/context/context.module';
import { ProjectFeedModule } from './subdomains/project-feed/project-feed.module';
import { StudentBookmarksModule } from './subdomains/bookmarks/bookmarks.module';
import { NotificationModule } from '@modules/shared/notification/notification.module';
import { NotificationAdapter } from '@modules/shared/notification/dto';
import { AuthModule } from '@modules/core/auth/auth.module';

@Module({
  imports: [
    ContextModule,
    AuthModule,
    ProjectFeedModule,
    StudentBookmarksModule,
    NotificationModule.register({
      adapter: NotificationAdapter.WEBSOCKET,
      persist: false,
      enableLogging: true,
      maxRetries: 3,
    }),
  ],
  providers: [StudentsService, StudentsResolver],
  exports: [StudentsService],
})
export class StudentsModule {}
