import { Module } from '@nestjs/common';
import { ExperiencesService } from './experiences.service';
import { ExperiencesResolver } from './experiences.resolver';
import { DatabaseModule } from '@database/database.module';
import { ContextModule } from '@modules/shared/context/context.module';
import { NotificationModule } from '@modules/shared/notification/notification.module';

@Module({
  imports: [DatabaseModule, ContextModule, NotificationModule],
  providers: [ExperiencesService, ExperiencesResolver],
  exports: [ExperiencesService],
})
export class ExperiencesModule {}
