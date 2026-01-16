// ============================================================================
// PART 6: MODULE
// src/modules/bookmarks/bookmarks.module.ts
// ============================================================================

import { Module } from '@nestjs/common';
import { BookmarksService } from './bookmarks.service';
import { BookmarksResolver } from './bookmarks.resolver';
import { DatabaseModule } from '@database/database.module';
import { ContextModule } from '@shared/context/context.module';
import { NotificationModule } from '@shared/notification/notification.module';
import { ProjectsModule } from '@modules/core/projects/projects.module';

@Module({
  imports: [DatabaseModule, ContextModule, NotificationModule, ProjectsModule],
  providers: [BookmarksService, BookmarksResolver],
  exports: [BookmarksService],
})
export class BookmarksModule {}
