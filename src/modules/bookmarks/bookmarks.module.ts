// ============================================================================
// PART 6: MODULE
// src/modules/bookmarks/bookmarks.module.ts
// ============================================================================

import { Module } from '@nestjs/common';
import { BookmarksService } from './bookmarks.service';
import { BookmarksResolver } from './bookmarks.resolver';
import { DatabaseModule } from '@database/database.module';
import { ContextModule } from '@modules/shared/context/context.module';
import { NotificationModule } from '@modules/shared/notification/notification.module';

@Module({
  imports: [DatabaseModule, ContextModule, NotificationModule],
  providers: [BookmarksService, BookmarksResolver],
  exports: [BookmarksService],
})
export class BookmarksModule {}
