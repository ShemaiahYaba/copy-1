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

@Module({
  imports: [DatabaseModule, ProjectsModule, ContextModule, NotificationModule],
  providers: [StudentBookmarksService, StudentBookmarksResolver],
  exports: [StudentBookmarksService],
})
export class StudentBookmarksModule {}
