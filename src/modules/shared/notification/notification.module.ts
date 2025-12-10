// src/modules/notification/notification.module.ts

import { Module, DynamicModule } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationGateway } from './notification.gateway';
import { NotificationConfigDto } from './dto';

@Module({})
export class NotificationModule {
  static register(config?: NotificationConfigDto): DynamicModule {
    // Use provided config or default
    const notificationConfig = config || new NotificationConfigDto();

    return {
      module: NotificationModule,
      providers: [
        {
          provide: 'NOTIFICATION_CONFIG',
          useValue: notificationConfig,
        },
        NotificationService,
        NotificationGateway,
      ],
      exports: [NotificationService],
    };
  }

  /**
   * Register as global module
   * Use this if you want the notification service available everywhere
   */
  static forRoot(config?: NotificationConfigDto): DynamicModule {
    const module = this.register(config);
    return {
      ...module,
      global: true,
    };
  }
}
