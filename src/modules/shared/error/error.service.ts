// ----------------------------------------------------------------------------
// ERROR SERVICE - UPDATED WITH PROPER SENTRY INTEGRATION
// src/modules/shared/error/error.service.ts
// ----------------------------------------------------------------------------

import { Injectable, Inject, Logger, HttpException } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import { ErrorConfigDto } from './dto/error-config.dto';
import { ErrorResponseDto } from './dto/error-response.dto';
import { ErrorCode } from './constants/error-codes.constant';
import { ErrorNotificationStrategy } from './dto/error-config.dto';
import { ErrorSeverity } from './interfaces/error.interface';
import { AppError } from './classes/app-error.class';
import { ERROR_CODES } from './constants/error-codes.constant';

@Injectable()
export class ErrorService {
  private readonly logger = new Logger(ErrorService.name);
  private readonly sensitiveKeys = [
    'password',
    'token',
    'apiKey',
    'secret',
    'creditCard',
    'ssn',
    'connectionString',
    'authorization',
    'cookie',
  ];

  constructor(
    @Inject('ERROR_CONFIG')
    private readonly config: ErrorConfigDto,
  ) {}

  processError(error: any, request?: any): ErrorResponseDto {
    if (error instanceof AppError) {
      return ErrorResponseDto.fromAppError(
        error,
        request,
        this.config.includeStackTrace,
      );
    }

    if (error instanceof HttpException) {
      return new ErrorResponseDto({
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        message: error.message,
        timestamp: new Date(),
        path: request?.url,
        method: request?.method,
        stack: this.config.includeStackTrace ? error.stack : undefined,
      });
    }

    return new ErrorResponseDto({
      code: ERROR_CODES.UNKNOWN_ERROR,
      message: error?.message || 'An unknown error occurred',
      timestamp: new Date(),
      path: request?.url,
      method: request?.method,
      stack: this.config.includeStackTrace ? error?.stack : undefined,
    });
  }

  shouldNotify(error: AppError): boolean {
    const { notificationStrategy } = this.config;

    switch (notificationStrategy) {
      case ErrorNotificationStrategy.ALL:
        return true;
      case ErrorNotificationStrategy.OPERATIONAL:
        return error.isOperational;
      case ErrorNotificationStrategy.CRITICAL:
        return error.severity === ErrorSeverity.CRITICAL;
      case ErrorNotificationStrategy.NONE:
        return false;
      default:
        return false;
    }
  }

  logError(error: any, context?: Record<string, any>): void {
    if (!this.config.logErrors) return;

    const sanitizedContext = this.sanitizeContext(context);

    if (error instanceof AppError) {
      const logLevel = this.getLogLevel(error.severity);
      this.logger[logLevel](
        `[${error.code}] ${error.message}`,
        JSON.stringify(sanitizedContext),
      );
    } else {
      this.logger.error(
        error?.message || 'Unknown error',
        error?.stack,
        JSON.stringify(sanitizedContext),
      );
    }
  }

  createError(
    code: ErrorCode,
    message?: string,
    context?: Record<string, any>,
  ): AppError {
    return new AppError(code, message, context);
  }

  /**
   * Report error to Sentry with proper context and severity mapping
   */
  async reportError(error: any, context?: Record<string, any>): Promise<void> {
    if (!this.config.enableSentry) {
      return;
    }

    try {
      // Sanitize context before sending to Sentry
      const sanitizedContext = this.sanitizeContext(context);

      // Set Sentry scope with additional context
      Sentry.withScope((scope) => {
        // Add custom context
        if (sanitizedContext && Object.keys(sanitizedContext).length > 0) {
          scope.setContext('error_context', sanitizedContext);
        }

        // Add error details for AppError
        if (error instanceof AppError) {
          scope.setLevel(this.getSentryLevel(error));
          scope.setTag('error_code', error.code);
          scope.setTag('is_operational', error.isOperational.toString());
          scope.setTag('severity', error.severity);

          // Add error context
          if (error.context) {
            scope.setContext(
              'app_error_context',
              this.sanitizeContext(error.context),
            );
          }
        }

        // Add request context if available
        if (context?.url) {
          scope.setTag('request_path', context.url);
        }
        if (context?.method) {
          scope.setTag('request_method', context.method);
        }
        if (context?.correlationId) {
          scope.setTag('correlation_id', context.correlationId);
        }

        // Capture the exception
        Sentry.captureException(error);
      });

      this.logger.debug(
        `Error reported to Sentry: ${error.message || 'Unknown error'}`,
      );
    } catch (reportError) {
      // Fail silently in production, log in development
      this.logger.error('Failed to report error to Sentry', reportError);
    }
  }

  /**
   * Report a custom message to Sentry
   */
  reportMessage(
    message: string,
    level: Sentry.SeverityLevel = 'info',
    context?: Record<string, any>,
  ): void {
    if (!this.config.enableSentry) {
      return;
    }

    try {
      Sentry.withScope((scope) => {
        scope.setLevel(level);

        if (context) {
          const sanitized = this.sanitizeContext(context);
          scope.setContext('message_context', sanitized);
        }

        Sentry.captureMessage(message);
      });
    } catch (error) {
      this.logger.error('Failed to report message to Sentry', error);
    }
  }

  private sanitizeContext(context?: Record<string, any>): Record<string, any> {
    if (!context) return {};

    const sanitized = { ...context };

    for (const key of this.sensitiveKeys) {
      if (key in sanitized) {
        sanitized[key] = '***REDACTED***';
      }
    }

    return sanitized;
  }

  private getLogLevel(
    severity: ErrorSeverity,
  ): 'log' | 'warn' | 'error' | 'debug' {
    switch (severity) {
      case ErrorSeverity.LOW:
        return 'log';
      case ErrorSeverity.MEDIUM:
        return 'warn';
      case ErrorSeverity.HIGH:
      case ErrorSeverity.CRITICAL:
        return 'error';
      default:
        return 'log';
    }
  }

  private getSentryLevel(error: any): Sentry.SeverityLevel {
    if (error instanceof AppError) {
      switch (error.severity) {
        case ErrorSeverity.LOW:
          return 'info';
        case ErrorSeverity.MEDIUM:
          return 'warning';
        case ErrorSeverity.HIGH:
          return 'error';
        case ErrorSeverity.CRITICAL:
          return 'fatal';
      }
    }
    return 'error';
  }
}
