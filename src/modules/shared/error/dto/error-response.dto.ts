// ----------------------------------------------------------------------------
// 7. ERROR RESPONSE DTO
// src/modules/shared/error/dto/error-response.dto.ts
// ----------------------------------------------------------------------------

import { ErrorCode } from '../constants/error-codes.constant';
import { IErrorResponse } from '../interfaces/error.interface';
import { ERROR_CODES } from '../constants/error-codes.constant';
import { AppError } from '../classes/app-error.class';

export class ErrorResponseDto implements IErrorResponse {
  [x: string]: any;
  status: 'error' = 'error';
  code: ErrorCode;
  message: string;
  details?: string;
  context?: Record<string, any>;
  timestamp: Date;
  path?: string;
  method?: string;
  correlationId?: string;
  stack?: string;

  constructor(partial: Partial<ErrorResponseDto>) {
    Object.assign(this, partial);
  }

  static fromAppError(
    error: AppError,
    request?: any,
    includeStack: boolean = false,
  ): ErrorResponseDto {
    return new ErrorResponseDto({
      code: error.code,
      message: error.message,
      context: error.context,
      timestamp: error.timestamp,
      path: request?.url,
      method: request?.method,
      correlationId: request?.correlationId,
      stack: includeStack ? error.stack : undefined,
    });
  }

  static internalError(message?: string): ErrorResponseDto {
    return new ErrorResponseDto({
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      message: message || 'Internal server error',
      timestamp: new Date(),
    });
  }
}
