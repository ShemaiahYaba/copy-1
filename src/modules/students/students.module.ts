// ============================================================================
// STUDENTS MODULE (Parent Domain Module)
// src/modules/students/students.module.ts
// ============================================================================

import { Module } from '@nestjs/common';
import { StudentsService } from './students.service';
import { StudentsResolver } from './students.resolver';
import { ContextModule } from '@modules/shared/context/context.module';
import { ProjectFeedModule } from './subdomains/project-feed/project-feed.module';

@Module({
  imports: [ContextModule, ProjectFeedModule],
  providers: [StudentsService, StudentsResolver],
  exports: [StudentsService],
})
export class StudentsModule {}
