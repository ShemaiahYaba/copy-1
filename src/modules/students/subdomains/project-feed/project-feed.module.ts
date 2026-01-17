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

@Module({
  imports: [ProjectsModule, StudentBookmarksModule, ContextModule],
  providers: [ProjectFeedService, ProjectFeedResolver],
  exports: [ProjectFeedService],
})
export class ProjectFeedModule {}
