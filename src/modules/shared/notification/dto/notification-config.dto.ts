// src/modules/notification/dto/notification-config.dto.ts

import { IsEnum, IsBoolean, IsOptional, IsNumber } from 'class-validator';

export enum NotificationAdapter {
  WEBSOCKET = 'websocket',
  DATABASE = 'database',
  QUEUE = 'queue',
}

export class NotificationConfigDto {
  @IsEnum(NotificationAdapter)
  adapter: NotificationAdapter = NotificationAdapter.WEBSOCKET;

  @IsBoolean()
  persist: boolean = false;

  @IsBoolean()
  enableLogging: boolean = true;

  @IsOptional()
  @IsNumber()
  maxRetries?: number = 3;
}
