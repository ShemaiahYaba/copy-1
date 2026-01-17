import { Module } from '@nestjs/common';
import { TeamsService } from './teams.service';
import { TeamsResolver } from './teams.resolver';
import { DatabaseModule } from '@database/database.module';
import { ContextModule } from '@modules/shared/context/context.module';
import { NotificationModule } from '@modules/shared/notification/notification.module';
import { NotificationAdapter } from '@modules/shared/notification/dto';
import { AuthModule } from '@modules/core/auth/auth.module';

@Module({
  imports: [
    DatabaseModule,
    ContextModule,
    AuthModule,
    NotificationModule.register({
      adapter: NotificationAdapter.WEBSOCKET,
      persist: false,
      enableLogging: true,
      maxRetries: 3,
    }),
  ],
  providers: [TeamsService, TeamsResolver],
  exports: [TeamsService],
})
export class TeamsModule {}
