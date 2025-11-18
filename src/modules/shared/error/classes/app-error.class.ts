// ----------------------------------------------------------------------------
// 3. APP ERROR CLASS
// src/modules/shared/error/classes/app-error.class.ts
// ----------------------------------------------------------------------------

import {
  ErrorSeverity,
  IAppError,
  IErrorResponse,
} from '../interfaces/error.interface';
import { ErrorCode } from '../constants/error-codes.constant';
import { ERROR_MESSAGES } from '../constants/error-codes.constant';

export class AppError extends Error implements IAppError {
  public readonly code: ErrorCode;
  public readonly severity: ErrorSeverity;
  public readonly context?: Record<string, any>;
  public readonly isOperational: boolean;
  public readonly timestamp: Date;

  constructor(
    code: ErrorCode,
    message?: string,
    context?: Record<string, any>,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    isOperational: boolean = true,
  ) {
    super(message || ERROR_MESSAGES[code]);

    this.code = code;
    this.message = message ?? (ERROR_MESSAGES[code] || 'Unknown error');
    this.severity = severity;
    this.context = context;
    this.isOperational = isOperational;
    this.timestamp = new Date();

    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, AppError.prototype);
  }

  toJSON(): IErrorResponse {
    return {
      status: 'error',
      code: this.code,
      message: this.message,
      context: this.context,
      timestamp: this.timestamp,
    };
  }

  static high(
    code: ErrorCode,
    message?: string,
    context?: Record<string, any>,
  ): AppError {
    return new AppError(code, message, context, ErrorSeverity.HIGH);
  }

  static critical(
    code: ErrorCode,
    message?: string,
    context?: Record<string, any>,
  ): AppError {
    return new AppError(code, message, context, ErrorSeverity.CRITICAL, false);
  }
}
