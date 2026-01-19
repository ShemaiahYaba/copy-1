import { Module } from '@nestjs/common';
import { ExperiencesService } from './experiences.service';
import { ExperiencesResolver } from './experiences.resolver';
import { DatabaseModule } from '@database/database.module';
import { ContextModule } from '@modules/shared/context/context.module';
import { AuthModule } from '@modules/core/auth/auth.module';

@Module({
  imports: [DatabaseModule, ContextModule, AuthModule],
  providers: [ExperiencesService, ExperiencesResolver],
  exports: [ExperiencesService],
})
export class ExperiencesModule {}
