// ----------------------------------------------------------------------------
// 6. ERROR CONFIG DTO
// src/modules/shared/error/dto/error-config.dto.ts
// ----------------------------------------------------------------------------

import { IsBoolean, IsEnum, IsOptional } from 'class-validator';

export enum ErrorNotificationStrategy {
  ALL = 'ALL',
  OPERATIONAL = 'OPERATIONAL',
  CRITICAL = 'CRITICAL',
  NONE = 'NONE',
}

export class ErrorConfigDto {
  @IsBoolean()
  includeStackTrace: boolean = false;

  @IsBoolean()
  notifyFrontend: boolean = true;

  @IsEnum(ErrorNotificationStrategy)
  notificationStrategy: ErrorNotificationStrategy =
    ErrorNotificationStrategy.OPERATIONAL;

  @IsBoolean()
  logErrors: boolean = true;

  @IsBoolean()
  captureContext: boolean = true;

  @IsOptional()
  @IsBoolean()
  enableSentry?: boolean = false;
}
