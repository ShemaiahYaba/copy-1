// ============================================================================
// STUDENT EXPERIENCES MODULE
// src/modules/students/subdomains/experiences/experiences.module.ts
// ============================================================================

import { Module } from '@nestjs/common';
import { StudentExperiencesService } from './experiences.service';
import { StudentExperiencesResolver } from './experiences.resolver';
import { ExperiencesModule } from '@modules/core/experiences/experiences.module';
import { ProjectsModule } from '@modules/core/projects/projects.module';
import { ContextModule } from '@modules/shared/context/context.module';
import { AuthModule } from '@modules/core/auth/auth.module';
import { NotificationModule } from '@modules/shared/notification/notification.module';
import { NotificationAdapter } from '@modules/shared/notification/dto';

@Module({
  imports: [
    AuthModule, // ← Required for JwtAuthGuard (SupabaseService, UserService)
    NotificationModule.register({
      // ← Required for JwtAuthGuard (NotificationService)
      adapter: NotificationAdapter.WEBSOCKET,
      persist: false,
      enableLogging: true,
    }),
    ExperiencesModule,
    ProjectsModule,
    ContextModule,
  ],
  providers: [StudentExperiencesService, StudentExperiencesResolver],
  exports: [StudentExperiencesService],
})
export class StudentExperiencesModule {}
