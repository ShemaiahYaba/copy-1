// ============================================================================
// PART 6: MODULE
// src/modules/projects/projects.module.ts
// ============================================================================

import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsResolver } from './projects.resolver';
import { DatabaseModule } from '@database/database.module';
import { ContextModule } from '@modules/shared/context/context.module';
import { NotificationModule } from '@modules/shared/notification/notification.module';

@Module({
  imports: [DatabaseModule, ContextModule, NotificationModule],
  providers: [ProjectsService, ProjectsResolver],
  exports: [ProjectsService],
})
export class ProjectsModule {}

// ============================================================================
// PART 7: UPDATE SCHEMA INDEX
// Add to src/database/schema/index.ts
// ============================================================================

// Add these exports to your existing schema/index.ts file:

export {
  projects,
  projectStatusEnum,
  projectApprovalStatusEnum,
  projectCategoryEnum,
} from '@core/projects/models/project.model';

export type {
  Project,
  NewProject,
  ProjectStatus,
  ProjectApprovalStatus,
  ProjectCategory,
} from '@core/projects/models/project.model';
