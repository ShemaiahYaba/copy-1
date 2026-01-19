// ============================================================================
// STUDENT DASHBOARD MODULE
// src/modules/students/subdomains/dashboard/dashboard.module.ts
// ============================================================================

import { Module } from '@nestjs/common';
import { StudentDashboardService } from './dashboard.service';
import { StudentDashboardResolver } from './dashboard.resolver';
import { ProjectsModule } from '@modules/core/projects/projects.module';
import { ExperiencesModule } from '@modules/core/experiences/experiences.module';
import { TeamsModule } from '@modules/core/teams/teams.module';
import { StudentBookmarksModule } from '../bookmarks/bookmarks.module';
import { ContextModule } from '@modules/shared/context/context.module';
import { AuthModule } from '@modules/core/auth/auth.module';

@Module({
  imports: [
    AuthModule,
    ProjectsModule,
    ExperiencesModule,
    TeamsModule,
    StudentBookmarksModule,
    ContextModule,
  ],
  providers: [StudentDashboardService, StudentDashboardResolver],
  exports: [StudentDashboardService],
})
export class StudentDashboardModule {}
