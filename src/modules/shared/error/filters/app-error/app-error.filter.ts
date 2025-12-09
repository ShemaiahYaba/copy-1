// ----------------------------------------------------------------------------
// REFACTORED — AppErrorFilter (With Sentry Integration)
// src/modules/shared/error/filters/app-error/app-error.filter.ts
// ----------------------------------------------------------------------------

import * as common from '@nestjs/common';
import { Response, Request } from 'express';
import { SentryExceptionCaptured } from '@sentry/nestjs';

import { AppError } from '../../classes/app-error.class';
import { ErrorService } from '../../error.service';
import { ErrorConfigDto } from '../../dto/error-config.dto';
import { ErrorSeverity } from '../../interfaces/error.interface';
import { ErrorCode, ERROR_CODES } from '../../constants/error-codes.constant';

import { NotificationService } from '../../../notification/notification.service';
import { NotificationType } from '../../../notification/interfaces/notification.interface';

@common.Catch()
export class AppErrorFilter implements common.ExceptionFilter {
  private readonly logger = new common.Logger(AppErrorFilter.name);

  constructor(
    private readonly errorService: ErrorService,
    private readonly notificationService: NotificationService,
    @common.Inject('ERROR_CONFIG') private readonly config: ErrorConfigDto,
  ) {}

  /**
   * Global exception handler with Sentry integration
   * The @SentryExceptionCaptured() decorator automatically reports exceptions to Sentry
   */
  @SentryExceptionCaptured()
  catch(rawException: unknown, host: common.ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    // Handle BadRequestException (validation errors) specially
    if (rawException instanceof common.BadRequestException) {
      return this.handleValidationError(rawException, req, res);
    }

    // Use ErrorService.processError to transform the error
    const errorResponse = this.errorService.processError(rawException, req);

    // Determine the correct HTTP status code
    const statusCode = this.extractStatusCode(rawException, errorResponse.code);

    // Extract additional metadata for AppError instances
    let shouldNotifyFrontend = false;
    let shouldReport = false;

    if (rawException instanceof AppError) {
      shouldNotifyFrontend =
        this.config.notifyFrontend &&
        this.errorService.shouldNotify(rawException);
      shouldReport = rawException.severity === ErrorSeverity.CRITICAL;
    }

    // 🔔 Send FE notification if required
    if (shouldNotifyFrontend) {
      this.safeNotifyFrontend(errorResponse);
    }

    // 📬 Report critical errors (Sentry reporting happens via decorator)
    if (shouldReport) {
      this.errorService.reportError(rawException, req).catch((err) => {
        this.logger.error('Failed to report critical error:', err);
      });
    }

    // Add correlationId if present
    const response = this.enrichResponse(errorResponse, req);

    // Send final response
    return res.status(statusCode).json(response);
  }

  // --------------------------------------------------------------------------
  // Helper: Handle validation errors (BadRequestException)
  // --------------------------------------------------------------------------
  private handleValidationError(
    exception: common.BadRequestException,
    req: Request,
    res: Response,
  ) {
    const exceptionResponse = exception.getResponse() as any;

    // Extract validation messages
    const messages = Array.isArray(exceptionResponse.message)
      ? exceptionResponse.message
      : [exceptionResponse.message || 'Validation failed'];

    const response: any = {
      status: 'error',
      code: ERROR_CODES.VALIDATION_ERROR,
      message: messages,
      timestamp: new Date().toISOString(),
      path: req.url,
      method: req.method,
    };

    // Add correlationId if present
    const correlationId = (req as any).correlationId;
    if (correlationId) {
      response.correlationId = correlationId;
    }

    return res.status(400).json(response);
  }

  // --------------------------------------------------------------------------
  // Helper: Enrich response with correlationId
  // --------------------------------------------------------------------------
  private enrichResponse(errorResponse: any, req: Request) {
    const correlationId = (req as any).correlationId;

    if (correlationId) {
      return {
        ...errorResponse,
        correlationId,
      };
    }

    return errorResponse;
  }

  // --------------------------------------------------------------------------
  // Helper: Safe notification wrapper
  // --------------------------------------------------------------------------
  private safeNotifyFrontend(errorResponse: any) {
    const message = Array.isArray(errorResponse.message)
      ? errorResponse.message.join(', ')
      : errorResponse.message;

    this.notificationService
      .push({
        type: NotificationType.ERROR,
        message,
        context: {
          code: errorResponse.code,
          ...(errorResponse.context || {}),
        },
      })
      .catch((err) =>
        this.logger.error(
          'Failed to dispatch frontend error notification',
          err,
        ),
      );
  }

  // --------------------------------------------------------------------------
  // Helper: Extract HTTP status code from exception
  // --------------------------------------------------------------------------
  private extractStatusCode(exception: unknown, errorCode: ErrorCode): number {
    // For HttpException, use its status directly
    if (exception instanceof common.HttpException) {
      return exception.getStatus();
    }

    // For AppError, map error code to status
    if (exception instanceof AppError) {
      return this.mapErrorCodeToStatus(errorCode);
    }

    // Default to 500 for unknown errors
    return 500;
  }

  // --------------------------------------------------------------------------
  // Helper: Map error codes to HTTP status
  // --------------------------------------------------------------------------
  private mapErrorCodeToStatus(code: ErrorCode): number {
    const statusMap: Record<ErrorCode, number> = {
      // General
      ERR_1000: 500,
      ERR_1001: 500,
      ERR_1002: 503,
      ERR_1003: 504,

      // Validation
      ERR_2000: 400,
      ERR_2001: 400,
      ERR_2002: 400,
      ERR_2003: 400,
      ERR_2004: 400,

      // Auth
      ERR_3000: 401,
      ERR_3001: 401,
      ERR_3002: 401,
      ERR_3003: 403,
      ERR_3004: 401,

      // Resource
      ERR_4000: 404,
      ERR_4001: 404,
      ERR_4002: 409,
      ERR_4003: 409,

      // Business Logic
      ERR_5000: 422,
      ERR_5001: 422,
      ERR_5002: 403,
      ERR_5003: 429,

      // External Services
      ERR_6000: 502,
      ERR_6001: 502,
      ERR_6002: 500,
      ERR_6003: 500,
    };

    return statusMap[code] ?? 500;
  }
}
