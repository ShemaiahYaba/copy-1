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
import { StudentExperiencesModule } from './subdomains/experiences/experiences.module';
import { StudentDashboardModule } from './subdomains/dashboard/dashboard.module';
import { AuthModule } from '@modules/core/auth/auth.module';

@Module({
  imports: [
    ContextModule,
    AuthModule,
    ProjectFeedModule,
    StudentBookmarksModule,
    StudentExperiencesModule,
    StudentDashboardModule,
  ],
  providers: [StudentsService, StudentsResolver],
  exports: [StudentsService],
})
export class StudentsModule {}
