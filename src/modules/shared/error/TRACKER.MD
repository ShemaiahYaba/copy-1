// ============================================================================
// ERROR MODULE - INDEX FILES & USAGE EXAMPLES
// ============================================================================

// ----------------------------------------------------------------------------
// BARREL EXPORTS
// ----------------------------------------------------------------------------

// src/modules/shared/error/interfaces/index.ts
export \* from './error.interface';

// src/modules/shared/error/constants/index.ts
export \* from './error-codes.constant';

// src/modules/shared/error/classes/index.ts
export _ from './app-error.class';
export _ from './validation-error.class';
export \* from './business-error.class';

// src/modules/shared/error/dto/index.ts
export _ from './error-config.dto';
export _ from './error-response.dto';

// src/modules/shared/error/filters/index.ts
export \* from './app-error.filter';

// src/modules/shared/error/index.ts
export _ from './interfaces';
export _ from './constants';
export _ from './classes';
export _ from './dto';
export _ from './filters';
export _ from './error.service';
export \* from './error.module';

// ----------------------------------------------------------------------------
// USAGE IN APP.MODULE.TS
// ----------------------------------------------------------------------------

import { Module } from '@nestjs/common';
import { ErrorModule } from './modules/shared/error';
import { NotificationModule } from './modules/shared/notification';
import {
ErrorNotificationStrategy,
} from './modules/shared/error/dto/error-config.dto';

@Module({
imports: [
// Import NotificationModule first
NotificationModule.register({
adapter: 'websocket',
persist: true,
enableLogging: true,
}),

    // Then ErrorModule (depends on NotificationModule)
    ErrorModule.register({
      includeStackTrace: process.env.NODE_ENV === 'development',
      notifyFrontend: true,
      notificationStrategy: ErrorNotificationStrategy.OPERATIONAL,
      logErrors: true,
      captureContext: true,
      enableSentry: process.env.NODE_ENV === 'production',
    }),

    // Your other modules...

],
})
export class AppModule {}

// ----------------------------------------------------------------------------
// USAGE EXAMPLES IN SERVICES
// ----------------------------------------------------------------------------

// Example 1: Basic Service with Error Handling
import { Injectable } from '@nestjs/common';
import { AppError, ERROR_CODES } from '@/modules/shared/error';

@Injectable()
export class ProjectService {
async getProject(id: string) {
const project = await this.projectRepo.findOne(id);

    if (!project) {
      throw new AppError(
        ERROR_CODES.RESOURCE_NOT_FOUND,
        'Project not found',
        { projectId: id },
      );
    }

    return project;

}

async deleteProject(id: string) {
const project = await this.getProject(id);

    if (project.tasks.length > 0) {
      throw new BusinessError(
        'Cannot delete project with active tasks',
        {
          projectId: id,
          taskCount: project.tasks.length,
        },
      );
    }

    await this.projectRepo.delete(id);

}
}

// Example 2: Validation Error Usage
import { ValidationError } from '@/modules/shared/error';

@Injectable()
export class UserService {
async createUser(dto: CreateUserDto) {
// Manual validation example
const errors = [];

    if (!dto.email.includes('@')) {
      errors.push({
        field: 'email',
        message: 'Invalid email format',
        value: dto.email,
      });
    }

    if (dto.age < 18) {
      errors.push({
        field: 'age',
        message: 'Must be at least 18 years old',
        value: dto.age,
      });
    }

    if (errors.length > 0) {
      throw new ValidationError(errors);
    }

    return this.userRepo.save(dto);

}
}

// Example 3: Using with class-validator
import { ValidationPipe } from '@nestjs/common';
import { validate } from 'class-validator';

@Injectable()
export class AuthService {
async register(dto: RegisterDto) {
const errors = await validate(dto);

    if (errors.length > 0) {
      throw ValidationError.fromValidationErrors(errors);
    }

    // Registration logic...

}
}

// Example 4: Critical Errors
import { AppError, ERROR_CODES } from '@/modules/shared/error';

@Injectable()
export class PaymentService {
async processPayment(amount: number) {
try {
await this.paymentGateway.charge(amount);
} catch (error) {
throw AppError.critical(
ERROR_CODES.EXTERNAL_SERVICE_ERROR,
'Payment processing failed',
{
amount,
originalError: error.message,
},
);
}
}
}

// Example 5: Business Logic Errors
import { BusinessError } from '@/modules/shared/error';

@Injectable()
export class OrderService {
async cancelOrder(orderId: string) {
const order = await this.getOrder(orderId);

    if (order.status === 'shipped') {
      throw BusinessError.notAllowed(
        'cancel order',
        'Order has already been shipped',
      );
    }

    if (order.isPaid && !this.canRefund(order)) {
      throw BusinessError.invalidState(
        'Cannot cancel paid order outside refund window',
        {
          orderId,
          paidAt: order.paidAt,
          refundDeadline: order.refundDeadline,
        },
      );
    }

    await this.orderRepo.update(orderId, { status: 'cancelled' });

}
}

// ----------------------------------------------------------------------------
// USAGE IN CONTROLLERS
// ----------------------------------------------------------------------------

import { Controller, Get, Post, Body, Param } from '@nestjs/common';

@Controller('projects')
export class ProjectController {
constructor(private readonly projectService: ProjectService) {}

@Post()
async create(@Body() dto: CreateProjectDto) {
// Validation errors automatically caught and formatted
return this.projectService.create(dto);
}

@Get(':id')
async getOne(@Param('id') id: string) {
// AppError automatically caught by global filter
return this.projectService.getProject(id);
}
}

// ----------------------------------------------------------------------------
// CUSTOM EXCEPTION FILTER EXAMPLE
// ----------------------------------------------------------------------------

import {
ExceptionFilter,
Catch,
ArgumentsHost,
HttpException,
} from '@nestjs/common';
import { AppError, ErrorService } from '@/modules/shared/error';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
constructor(private readonly errorService: ErrorService) {}

catch(exception: HttpException, host: ArgumentsHost) {
const ctx = host.switchToHttp();
const response = ctx.getResponse();
const request = ctx.getRequest();

    // Convert HttpException to AppError
    const appError = new AppError(
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      exception.message,
      {
        statusCode: exception.getStatus(),
        path: request.url,
      },
    );

    const errorResponse = this.errorService.processError(appError, request);

    response.status(exception.getStatus()).json(errorResponse);

}
}

// ----------------------------------------------------------------------------
// INTERCEPTOR EXAMPLE
// ----------------------------------------------------------------------------

import {
Injectable,
NestInterceptor,
ExecutionContext,
CallHandler,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AppError, ERROR_CODES } from '@/modules/shared/error';

@Injectable()
export class ErrorTransformInterceptor implements NestInterceptor {
intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
return next.handle().pipe(
catchError((error) => {
// Transform database errors
if (error.code === '23505') {
return throwError(() =>
new AppError(
ERROR_CODES.ALREADY_EXISTS,
'Resource already exists',
{ originalError: error.message },
),
);
}

        // Re-throw as-is if already AppError
        if (error instanceof AppError) {
          return throwError(() => error);
        }

        // Wrap unknown errors
        return throwError(() =>
          new AppError(
            ERROR_CODES.INTERNAL_SERVER_ERROR,
            error.message,
          ),
        );
      }),
    );

}
}

// ----------------------------------------------------------------------------
// TESTING SETUP
// ----------------------------------------------------------------------------

// Example test setup
import { Test, TestingModule } from '@nestjs/testing';
import { ErrorModule } from '@/modules/shared/error';
import { ErrorService } from '@/modules/shared/error';

describe('ProjectService', () => {
let service: ProjectService;
let errorService: ErrorService;

beforeEach(async () => {
const module: TestingModule = await Test.createTestingModule({
imports: [
ErrorModule.register({
includeStackTrace: true,
notifyFrontend: false, // Disable in tests
logErrors: false, // Disable logs in tests
}),
],
providers: [ProjectService],
}).compile();

    service = module.get<ProjectService>(ProjectService);
    errorService = module.get<ErrorService>(ErrorService);

});

it('should throw AppError when project not found', async () => {
await expect(service.getProject('invalid-id')).rejects.toThrow(AppError);
});

it('should throw error with correct code', async () => {
try {
await service.getProject('invalid-id');
} catch (error) {
expect(error.code).toBe(ERROR_CODES.RESOURCE_NOT_FOUND);
}
});
});

// ----------------------------------------------------------------------------
// ENVIRONMENT CONFIGURATION
// ----------------------------------------------------------------------------

// .env.development
/_
NODE_ENV=development
ERROR_INCLUDE_STACK_TRACE=true
ERROR_NOTIFY_FRONTEND=true
ERROR_NOTIFICATION_STRATEGY=ALL
ERROR_LOG_ERRORS=true
ERROR_ENABLE_SENTRY=false
_/

// .env.production
/_
NODE_ENV=production
ERROR_INCLUDE_STACK_TRACE=false
ERROR_NOTIFY_FRONTEND=true
ERROR_NOTIFICATION_STRATEGY=OPERATIONAL
ERROR_LOG_ERRORS=true
ERROR_ENABLE_SENTRY=true
SENTRY_DSN=your-sentry-dsn
_/

// config/error.config.ts
import { ErrorConfigDto, ErrorNotificationStrategy } from '@/modules/shared/error';

export const errorConfig: ErrorConfigDto = {
includeStackTrace: process.env.ERROR_INCLUDE_STACK_TRACE === 'true',
notifyFrontend: process.env.ERROR_NOTIFY_FRONTEND !== 'false',
notificationStrategy:
(process.env.ERROR_NOTIFICATION_STRATEGY as ErrorNotificationStrategy) ||
ErrorNotificationStrategy.OPERATIONAL,
logErrors: process.env.ERROR_LOG_ERRORS !== 'false',
captureContext: true,
enableSentry: process.env.ERROR_ENABLE_SENTRY === 'true',
};

// ----------------------------------------------------------------------------
// INTEGRATION WITH NOTIFICATION MODULE
// ----------------------------------------------------------------------------

// The ErrorModule automatically integrates with NotificationModule.
// When an operational error occurs, it will:
// 1. Be caught by the global AppErrorFilter
// 2. Check if notification should be sent based on strategy
// 3. Call NotificationService.push() to notify frontend
// 4. Frontend receives error notification via WebSocket

// Frontend will receive notifications like:
/_
{
id: "uuid",
type: "ERROR",
message: "Project not found",
context: {
code: "ERR_4001",
projectId: "123"
},
timestamp: "2025-11-18T12:00:00Z"
}
_/

// ----------------------------------------------------------------------------
// MIDDLEWARE EXAMPLE (Optional)
// ----------------------------------------------------------------------------

import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
use(req: Request, res: Response, next: NextFunction) {
// Add correlation ID to request for error tracking
req['correlationId'] = req.headers['x-correlation-id'] || uuidv4();
res.setHeader('x-correlation-id', req['correlationId']);
next();
}
}

// Apply in app.module.ts
export class AppModule implements NestModule {
configure(consumer: MiddlewareConsumer) {
consumer.apply(CorrelationIdMiddleware).forRoutes('\*');
}
}
