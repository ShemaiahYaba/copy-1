// ============================================================================
// PROJECT FEED MODULE
// src/modules/students/subdomains/project-feed/project-feed.module.ts
// ============================================================================

import { Module } from '@nestjs/common';
import { ProjectFeedService } from './project-feed.service';
import { ProjectFeedResolver } from './project-feed.resolver';
import { ProjectsModule } from '@modules/core/projects/projects.module';
import { StudentBookmarksModule } from '../bookmarks/bookmarks.module';
import { ContextModule } from '@modules/shared/context/context.module';
import { AuthModule } from '@modules/core/auth/auth.module';
import { NotificationModule } from '@modules/shared/notification/notification.module';
import { NotificationAdapter } from '@modules/shared/notification/dto';

@Module({
  imports: [
    ProjectsModule,
    StudentBookmarksModule,
    ContextModule,
    AuthModule,
    NotificationModule.register({
      adapter: NotificationAdapter.WEBSOCKET,
      persist: false,
      enableLogging: true,
      maxRetries: 3,
    }),
  ],
  providers: [ProjectFeedService, ProjectFeedResolver],
  exports: [ProjectFeedService],
})
export class ProjectFeedModule {}
