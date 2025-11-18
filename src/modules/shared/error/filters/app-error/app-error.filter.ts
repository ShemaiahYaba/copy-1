// ----------------------------------------------------------------------------
// 9. APP ERROR FILTER
// src/modules/shared/error/filters/app-error.filter.ts
// ----------------------------------------------------------------------------

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { Logger } from '@nestjs/common';
import { ErrorConfigDto } from '../../dto/error-config.dto';
import { ErrorService } from '../../error.service';
import { ErrorCode } from '../../constants/error-codes.constant';
import { ErrorSeverity } from '../../interfaces/error.interface';
import { AppError } from '../../classes/app-error.class';
import { Inject } from '@nestjs/common';

@Catch()
export class AppErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(AppErrorFilter.name);

  constructor(
    private readonly errorService: ErrorService,
    private readonly notificationService: any, // NotificationService
    @Inject('ERROR_CONFIG') private readonly config: ErrorConfigDto,
  ) {}

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const errorResponse = this.errorService.processError(exception, request);

    if (this.config.logErrors) {
      this.errorService.logError(exception, {
        path: request.url,
        method: request.method,
      });
    }

    if (this.config.notifyFrontend && exception instanceof AppError) {
      if (this.errorService.shouldNotify(exception)) {
        this.notificationService
          .push({
            type: 'ERROR',
            message: exception.message,
            context: {
              code: exception.code,
              ...exception.context,
            },
          })
          .catch((err: any) => {
            this.logger.error('Failed to send error notification:', err);
          });
      }
    }

    if (
      exception instanceof AppError &&
      exception.severity === ErrorSeverity.CRITICAL
    ) {
      this.errorService.reportError(exception, { request }).catch((err) => {
        this.logger.error('Failed to report error:', err);
      });
    }

    const status = this.getHttpStatus(exception);
    response.status(status).json(errorResponse);
  }

  private getHttpStatus(exception: any): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }
    if (exception instanceof AppError) {
      return this.mapErrorCodeToStatus(exception.code);
    }
    return 500;
  }

  private mapErrorCodeToStatus(code: ErrorCode): number {
    const mapping: Record<string, number> = {
      ERR_3000: 401,
      ERR_3001: 401,
      ERR_3002: 401,
      ERR_3003: 403,
      ERR_3004: 401,
      ERR_4000: 404,
      ERR_4001: 404,
      ERR_4002: 409,
      ERR_4003: 409,
      ERR_2000: 400,
      ERR_2001: 400,
      ERR_2002: 400,
      ERR_2003: 400,
      ERR_2004: 400,
      ERR_5000: 422,
      ERR_5001: 422,
      ERR_5002: 403,
      ERR_5003: 429,
    };
    return mapping[code] || 500;
  }
}
