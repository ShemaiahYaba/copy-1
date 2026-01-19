// src/modules/notification/notification.module.ts

import { Module, DynamicModule, type Provider } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationGateway } from './notification.gateway';
import { NotificationConfigDto } from './dto';

@Module({})
export class NotificationModule {
  private static initialized = false;

  static register(config?: NotificationConfigDto): DynamicModule {
    const notificationConfig = config || new NotificationConfigDto();
    const providers: Provider[] = [
      {
        provide: 'NOTIFICATION_CONFIG',
        useValue: notificationConfig,
      },
      NotificationService,
    ];

    if (!NotificationModule.initialized) {
      providers.push(NotificationGateway);
      NotificationModule.initialized = true;
    }

    return {
      module: NotificationModule,
      providers,
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
