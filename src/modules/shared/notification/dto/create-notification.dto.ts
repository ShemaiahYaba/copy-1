// src/modules/notification/dto/create-notification.dto.ts

import { IsEnum, IsString, IsOptional, IsObject } from 'class-validator';
import { NotificationType } from '../interfaces/notification.interface';

export class CreateNotificationDto {
  @IsEnum(NotificationType)
  type: NotificationType;

  @IsString()
  message: string;

  @IsOptional()
  @IsObject()
  context?: Record<string, any>;
}
