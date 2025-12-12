# Error Handling Module

A production-ready, unified error handling system for NestJS applications. Provides standardized error responses, automatic frontend notifications, comprehensive error tracking with Sentry integration, and security-first design.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Installation](#installation)
- [Getting Started](#getting-started)
- [Standard Error Codes](#standard-error-codes)
- [Error Classes Reference](#error-classes-reference)
- [Implementation Examples](#implementation-examples)
- [API Reference](#api-reference)
- [Error Tracking with Sentry](#error-tracking-with-sentry)
- [Security and Error Handling](#security-and-error-handling)
- [Testing](#testing)

## Features

- **Unified Error Handling** - Global exception filter catches all errors
- **Standardized Error Responses** - Consistent error format across the application
- **Automatic Frontend Notifications** - Integrates with NotificationModule for real-time error alerts
- **Sentry Integration** - Automatic error reporting with severity mapping and context enrichment
- **Type-Safe Error Codes** - Centralized error code system with automatic message mapping
- **Security-First** - Automatic sensitive data sanitization
- **Configurable Behavior** - Control stack traces, logging, notification strategies, and Sentry reporting
- **Multiple Error Types** - AppError, ValidationError, BusinessError for different use cases
- **HTTP Status Mapping** - Automatic mapping of error codes to appropriate HTTP status codes
- **Full TypeScript Support** - Comprehensive type definitions
- **Extensive Test Coverage** - >85% coverage with 201 passing tests

## Architecture

### System Architecture

```typescript
error/
├── classes/                    # Error class definitions
│   ├── app-error.class.ts     # Base application error
│   ├── validation-error.class.ts
│   └── business-error.class.ts
├── filters/                    # Exception filters
│   └── app-error/
│       └── app-error.filter.ts # Global error handler with Sentry
├── dto/                        # Data transfer objects
│   ├── error-config.dto.ts    # Configuration options
│   └── error-response.dto.ts  # Response format
├── constants/                  # Error codes and messages
├── interfaces/                 # TypeScript interfaces
├── error.service.ts           # Core error processing logic
└── error.module.ts            # Module definition
```

### Workflow

1. **Error Thrown** - Any error occurs in your application
2. **Global Filter Catches** - `AppErrorFilter` intercepts the error (with `@SentryExceptionCaptured()` decorator)
3. **Automatic Sentry Reporting** - Critical errors automatically reported to Sentry
4. **Error Processing** - `ErrorService.processError()` transforms the error
5. **Notification** - If operational, sends notification to frontend
6. **Manual Reporting** - Additional context can be added via `reportError()` or `reportMessage()`
7. **Response** - Returns standardized JSON error response

## Installation

### Required Dependencies

All dependencies should already be installed as part of your NestJS project:

```bash
pnpm add @nestjs/common class-validator class-transformer uuid@9 @sentry/nestjs
```

### Development Dependencies

```bash
pnpm add -D @types/uuid
```

## Getting Started

### 1. Configure Sentry (Optional)

#### **⚠️ CRITICAL: Environment variables must be loaded BEFORE importing Sentry**

In your `main.ts`, follow this exact order:

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { EnvironmentConfig } from './config/environment';
import { corsOptions } from './config/cors';
import { setupSwagger } from './config/swagger';
import { logStartupInfo } from './utils/logger';

// ⚠️ STEP 1: Load environment variables FIRST
EnvironmentConfig.initialize(); // This loads .env file

// ⚠️ STEP 2: Import instrument.ts AFTER environment is loaded
// This is required because instrument.ts uses process.env.SENTRY_DSN
import './instrument';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // CORS Configuration
  app.enableCors(corsOptions);

  // Swagger Documentation Setup
  setupSwagger(app);

  // Start Server
  const port = EnvironmentConfig.getPort();
  await app.listen(port);

  // Startup Logs
  await logStartupInfo(app);
}

bootstrap().catch((error) => {
  console.error('❌ Failed to start application:', error);
  process.exit(1);
});
```

### Why This Order Matters

1. `EnvironmentConfig.initialize()` loads variables from `.env` into `process.env`
2. `instrument.ts` imports Sentry and reads `process.env.SENTRY_DSN`
3. If you import `instrument.ts` BEFORE initializing environment, `process.env.SENTRY_DSN` will be undefined

### Common Mistakes

````typescript
// ❌ WRONG - instrument.ts imported before environment
import './instrument'; // Will fail - SENTRY_DSN is undefined
import { EnvironmentConfig } from './config/environment';
EnvironmentConfig.initialize();

// ✅ CORRECT - environment loaded first
import { EnvironmentConfig } from './config/environment';
EnvironmentConfig.initialize();
import './instrument'; // Now SENTRY_DSN is available

### 2. Import the Module

In your `app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { SentryModule } from '@sentry/nestjs/setup';
import { ErrorModule } from './modules/shared/error';
import { NotificationModule } from './modules/shared/notification';
import { ErrorNotificationStrategy } from './modules/shared/error/dto/error-config.dto';
import { NotificationAdapter } from '@modules/shared/notification/dto';

@Module({
  imports: [
    // 1. Sentry Module (setup must come early)
    SentryModule.forRoot(),

    // 2. Notification Module (ErrorModule depends on it)
    NotificationModule.register({
      adapter: NotificationAdapter.WEBSOCKET,
      persist: true,
      enableLogging: process.env.NODE_ENV === 'development',
    }),

    // 3. Error Module with Sentry enabled
    ErrorModule.register({
      includeStackTrace: process.env.NODE_ENV === 'development',
      notifyFrontend: true,
      notificationStrategy: ErrorNotificationStrategy.OPERATIONAL,
      logErrors: true,
      captureContext: true,
      enableSentry: process.env.NODE_ENV === 'production', // ✅ Enable in production
    }),

    // 4. Your other modules
  ],
})
export class AppModule {}

// Important Notes:
// - SentryModule.forRoot() must come before ErrorModule
// - NotificationModule must come before ErrorModule (dependency)
// - Environment variables are already loaded from main.ts
````

### 3. Use in Services

```typescript
import { Injectable } from '@nestjs/common';
import { AppError, ERROR_CODES } from '@/modules/shared/error';

@Injectable()
export class ProjectService {
  async getProject(id: string) {
    const project = await this.projectRepo.findOne(id);

    if (!project) {
      // Automatically reported to Sentry if critical
      throw new AppError(ERROR_CODES.RESOURCE_NOT_FOUND, 'Project not found', {
        projectId: id,
      });
    }

    return project;
  }
}
```

### 4. Frontend Receives Notifications

When errors occur, connected clients automatically receive notifications:

```typescript
// Frontend - already connected to NotificationModule
socket.on('notification', (notification) => {
  if (notification.type === 'ERROR') {
    showErrorToast(notification.message);
    console.error('Error:', notification.context.code);
  }
});
```

## Standard Error Codes

### General Errors (1000-1999)

| Code | Message | HTTP Status |
| \***\*\*\*\***- | **\*\***\*\*\*\***\*\***\***\*\***\*\*\*\***\*\*** | \***\*\*\*\***-- |
| `ERR_1000` | An internal server error occurred | 500 |
| `ERR_1001` | An unknown error occurred | 500 |
| `ERR_1002` | Service temporarily unavailable | 503 |
| `ERR_1003` | Request timeout | 504 |

### Validation Errors (2000-2999)

| Code | Message | HTTP Status |
| \***\*\*\*\***- | **\*\***\*\***\*\***\*\***\*\***\*\***\*\***-- | \***\*\*\*\***-- |
| `ERR_2000` | Validation failed | 400 |
| `ERR_2001` | Invalid input provided | 400 |
| `ERR_2002` | Required field is missing | 400 |
| `ERR_2003` | Invalid format | 400 |
| `ERR_2004` | Value is out of acceptable range | 400 |

### Authentication Errors (3000-3999)

| Code | Message | HTTP Status |
| \***\*\*\*\***- | **\*\***\*\***\*\***\*\***\*\***\*\***\*\***-- | \***\*\*\*\***-- |
| `ERR_3000` | Unauthorized access | 401 |
| `ERR_3001` | Invalid authentication token | 401 |
| `ERR_3002` | Authentication token has expired | 401 |
| `ERR_3003` | Insufficient permissions | 403 |
| `ERR_3004` | Invalid credentials | 401 |

### Resource Errors (4000-4999)

| Code | Message | HTTP Status |
| \***\*\*\*\***- | \***\*\*\*\*\*\*\***\*\*\*\***\*\*\*\*\*\*\***- | \***\*\*\*\***-- |
| `ERR_4000` | Resource not found | 404 |
| `ERR_4001` | Requested resource not found | 404 |
| `ERR_4002` | Resource already exists | 409 |
| `ERR_4003` | Resource conflict | 409 |

### Business Logic Errors (5000-5999)

| Code | Message | HTTP Status |
| \***\*\*\*\***- | \***\*\*\*\*\*\*\***\*\*\*\***\*\*\*\*\*\*\*** | \***\*\*\*\***-- |
| `ERR_5000` | Business rule violation | 422 |
| `ERR_5001` | Invalid state for operation | 422 |
| `ERR_5002` | Operation not allowed | 403 |
| `ERR_5003` | Quota exceeded | 429 |

### External Service Errors (6000-6999)

| Code | Message | HTTP Status |
| \***\*\*\*\***- | \***\*\*\*\*\***\*\***\*\*\*\*\***- | \***\*\*\*\***-- |
| `ERR_6000` | External service error | 502 |
| `ERR_6001` | API request failed | 502 |
| `ERR_6002` | Database error | 500 |
| `ERR_6003` | Cache error | 500 |

## Error Classes Reference

### AppError

**When to use:** General application errors, resource errors, authentication errors

```typescript
// Basic usage
throw new AppError(ERROR_CODES.NOT_FOUND, 'Project not found');

// With context (automatically sanitized before Sentry)
throw new AppError(ERROR_CODES.UNAUTHORIZED, 'Access denied', {
  userId: '123',
  resource: 'project',
});

// High severity (reported to Sentry as 'error')
throw AppError.high(ERROR_CODES.DATABASE_ERROR, 'Database connection failed');

// Critical error (non-operational, reported to Sentry as 'fatal')
throw AppError.critical(ERROR_CODES.INTERNAL_SERVER_ERROR, 'System failure');
```

### ValidationError

**When to use:** Input validation failures, DTO validation

```typescript
// Manual validation
throw new ValidationError([
  { field: 'email', message: 'Invalid email format', value: 'notanemail' },
  { field: 'age', message: 'Must be at least 18', value: 15 },
]);

// From class-validator
import { validate } from 'class-validator';

const errors = await validate(dto);
if (errors.length > 0) {
  throw ValidationError.fromValidationErrors(errors);
}
```

### BusinessError

**When to use:** Business rule violations, workflow errors

```typescript
// General business error
throw new BusinessError('Cannot delete project with active tasks', {
  projectId: '123',
  activeTasks: 5,
});

// Invalid state
throw BusinessError.invalidState('Cannot approve rejected document', {
  documentId: '456',
  currentStatus: 'rejected',
});

// Operation not allowed
throw BusinessError.notAllowed('delete user', 'User has active subscriptions');
```

## Implementation Examples

### In Controllers

```typescript
@Controller('projects')
export class ProjectController {
  @Post()
  async create(@Body() dto: CreateProjectDto) {
    // Validation errors automatically caught and formatted
    return this.projectService.create(dto);
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    // AppError automatically caught by global filter
    // Critical errors automatically reported to Sentry
    return this.projectService.getProject(id);
  }
}
```

### In Services

```typescript
@Injectable()
export class UserService {
  async createUser(dto: CreateUserDto) {
    const existing = await this.userRepo.findByEmail(dto.email);

    if (existing) {
      throw new AppError(
        ERROR_CODES.ALREADY_EXISTS,
        'User with this email already exists',
        { email: dto.email },
      );
    }

    return this.userRepo.save(dto);
  }

  async deleteUser(userId: string) {
    const user = await this.getUser(userId);

    if (user.subscriptions.length > 0) {
      throw new BusinessError('Cannot delete user with active subscriptions', {
        userId,
        subscriptionCount: user.subscriptions.length,
      });
    }

    await this.userRepo.delete(userId);
  }
}
```

### Wrapping External Errors

```typescript
@Injectable()
export class PaymentService {
  constructor(private readonly errorService: ErrorService) {}

  async processPayment(amount: number) {
    try {
      await this.paymentGateway.charge(amount);
    } catch (error) {
      // Create critical error (automatically reported to Sentry)
      const criticalError = AppError.critical(
        ERROR_CODES.EXTERNAL_SERVICE_ERROR,
        'Payment processing failed',
        {
          amount,
          gateway: 'stripe',
          originalError: error.message,
        },
      );

      // Optionally add more context before throwing
      await this.errorService.reportError(criticalError, {
        attemptNumber: 1,
        timestamp: new Date().toISOString(),
      });

      throw criticalError;
    }
  }
}
```

### Using ErrorService Directly

```typescript
@Injectable()
export class OrderService {
  constructor(private readonly errorService: ErrorService) {}

  async validateOrder(order: Order) {
    if (order.total < 0) {
      throw this.errorService.createError(
        ERROR_CODES.INVALID_INPUT,
        'Order total cannot be negative',
        { orderId: order.id, total: order.total },
      );
    }
  }

  async logCustomMessage() {
    // Report custom message to Sentry
    this.errorService.reportMessage(
      'Payment gateway timeout threshold exceeded',
      'warning',
      { gateway: 'stripe', averageDelay: 3000, threshold: 2000 },
    );
  }
}
```

## API Reference

### AppError Class Reference

#### Constructor

```typescript
new AppError(
  code: ErrorCode,
  message?: string,
  context?: Record<string, any>,
  severity?: ErrorSeverity,
  isOperational?: boolean
)
```

#### Static Methods

```typescript
AppError.high(code, message?, context?)      // HIGH severity
AppError.critical(code, message?, context?)  // CRITICAL severity (non-operational)
```

#### Instance Methods

```typescript
error.toJSON(): IErrorResponse  // Convert to JSON format
```

### ValidationError Class Reference

#### Constructor (VECR)

```typescript
new ValidationError(
  errors: ValidationErrorDetail[],
  message?: string
)
```

#### Static Methods (VECR)

```typescript
ValidationError.fromValidationErrors(classValidatorErrors);
```

### BusinessError Class Reference

#### Constructor (BECR)

```typescript
new BusinessError(message: string, context?: Record<string, any>)
```

#### Static Methods (BECR)

```typescript
BusinessError.invalidState(message, context?)
BusinessError.notAllowed(operation, reason?)
```

### ErrorService Method Reference

#### ErrorService.processError()

Transform error to standard format.

**Parameters:**

- `error`: any - The error to process
- `request?`: any - Optional request context

**Returns:** ErrorResponseDto

**Example:**

```typescript
const errorResponse = service.processError(error, req);
```

---

#### `shouldNotify(error): boolean`

Determine if notification should be sent based on strategy.

**Parameters:**

- `error`: AppError - The error to check

**Returns:** boolean

**Example:**

```typescript
if (service.shouldNotify(error)) {
  // Send notification
}
```

---

#### ErrorService.logError()

Log error with sanitized context.

**Parameters:**

- `error`: any - The error to log
- `context?`: Record<string, any> - Additional context (will be sanitized)

**Example:**

```typescript
service.logError(error, { userId: '123', action: 'payment' });
```

---

#### ErrorService.reportError()

Report error to Sentry with proper context and severity mapping.

**Parameters:**

- `error`: any - The error to report
- `context?`: Record<string, any> - Additional context (will be sanitized)

**Returns:** `Promise<void>`

**Example:**

```typescript
await service.reportError(error, {
  userId: '123',
  correlationId: 'abc-123',
  endpoint: '/api/payments',
});
```

**Sentry Tags Added:**

- `error_code` - The error code (if AppError)
- `is_operational` - Whether error is operational
- `severity` - Error severity level
- `request_path` - Request path (if provided)
- `request_method` - Request method (if provided)
- `correlation_id` - Correlation ID (if provided)

---

#### `reportMessage(message, level?, context?): void`

Report custom message to Sentry.

**Parameters:**

- `message`: string - The message to report
- `level?`: SeverityLevel - Sentry severity level (default: 'info')
- `context?`: Record<string, any> - Additional context

**Example:**

```typescript
service.reportMessage('Payment gateway experiencing delays', 'warning', {
  gateway: 'stripe',
  averageDelay: 3000,
  threshold: 2000,
});
```

---

#### `createError(code, message?, context?): AppError`

Factory method for creating AppError instances.

**Parameters:**

- `code`: ErrorCode - The error code
- `message?`: string - Custom error message
- `context?`: Record<string, any> - Additional context

**Returns:** AppError

**Example:**

```typescript
const error = service.createError(ERROR_CODES.NOT_FOUND, 'Resource not found', {
  resourceId: '456',
});
```

---

## Error Tracking with Sentry

### 6. Sentry Not Reporting Errors

**Problem:** Errors not appearing in Sentry dashboard

**Solutions:**

```typescript
// 1. ✅ Verify initialization order in main.ts
// src/main.ts
import { EnvironmentConfig } from './config/environment';

// MUST come first
EnvironmentConfig.initialize();

// MUST come after
import './instrument';

// 2. ✅ Check DSN is set in .env
SENTRY_DSN=https://your-key@sentry.io/project-id

// 3. ✅ Verify DSN is valid
console.log('Sentry DSN:', process.env.SENTRY_DSN);

// 4. ✅ Check enableSentry is true
ErrorModule.register({
  enableSentry: true, // Must be true
});

// 5. ✅ Test manually
import * as Sentry from '@sentry/nestjs';
Sentry.captureMessage('Test from bootstrap');

// Common Issue: Wrong Import Order
// ❌ WRONG - This will cause SENTRY_DSN to be undefined
import './instrument';
import { EnvironmentConfig } from './config/environment';
EnvironmentConfig.initialize();

// ✅ CORRECT
import { EnvironmentConfig } from './config/environment';
EnvironmentConfig.initialize();
import './instrument';
```

### Overview

The Error Module provides seamless integration with Sentry for production error tracking. All errors caught by the global filter are automatically reported to Sentry via the `@SentryExceptionCaptured()` decorator.

### Setup

#### 1. Install Sentry

```bash
pnpm add @sentry/nestjs @sentry/profiling-node
```

#### 2. Initialize in main.ts

```typescript
import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

// Initialize Sentry before creating NestJS app
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: [nodeProfilingIntegration()],
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,
  environment: process.env.NODE_ENV,

  // Optional: Filter out sensitive data
  beforeSend(event) {
    // Modify event before sending
    return event;
  },
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // ... rest of bootstrap
}
```

#### 3. Enable in ErrorModule

```typescript
ErrorModule.register({
  enableSentry: process.env.NODE_ENV === 'production',
  // ... other config
});
```

### Automatic Error Reporting

The global exception filter uses the `@SentryExceptionCaptured()` decorator to automatically report all exceptions:

```typescript
@Catch()
export class AppErrorFilter implements ExceptionFilter {
  @SentryExceptionCaptured() // Automatically reports to Sentry
  catch(exception: unknown, host: ArgumentsHost) {
    // Error processing logic
  }
}
```

**What gets reported automatically:**

- All uncaught exceptions
- HTTP exceptions
- AppError instances (with metadata)
- ValidationError instances
- BusinessError instances
- Standard JavaScript errors

### Manual Error Reporting

For additional context or custom reporting:

```typescript
@Injectable()
export class PaymentService {
  constructor(private errorService: ErrorService) {}

  async processPayment(amount: number) {
    try {
      await this.gateway.charge(amount);
    } catch (error) {
      // Add custom context before reporting
      await this.errorService.reportError(error, {
        paymentAmount: amount,
        gateway: 'stripe',
        attemptNumber: 1,
        userId: this.getCurrentUserId(),
      });

      throw error;
    }
  }
}
```

### Severity Level Mapping

The module automatically maps AppError severity to Sentry severity levels:

| AppError Severity | Sentry Level | When to Use |
| **\*\***\*\*\***\*\***-- | \***\*\*\*\*\*\*\*** | **\*\*\*\***\*\*\*\***\*\*\*\***\*\***\*\*\*\***\*\*\*\***\*\*\*\*** |
| LOW | info | Minor validation errors, warnings |
| MEDIUM | warning | Business logic violations, expected errors |
| HIGH | error | Service failures, external API errors |
| CRITICAL | fatal | System failures, data corruption |

**Example:**

```typescript
// Reported to Sentry as 'info'
throw new AppError(
  ERROR_CODES.VALIDATION_ERROR,
  'Invalid input',
  undefined,
  ErrorSeverity.LOW,
);

// Reported to Sentry as 'fatal'
throw AppError.critical(ERROR_CODES.DATABASE_ERROR, 'Database connection lost');
```

### Context Enrichment

The ErrorService automatically enriches Sentry reports with:

**Error Context:**

```typescript
{
  error_code: 'ERR_4001',
  is_operational: 'true',
  severity: 'HIGH',
  correlation_id: 'abc-123',
  request_path: '/api/projects',
  request_method: 'POST'
}
```

**AppError Context:**

```typescript
{
  app_error_context: {
    projectId: '123',
    userId: '456',
    // ... sanitized context from AppError
  }
}
```

**Request Context (if available):**

```typescript
{
  request_path: '/api/projects',
  request_method: 'POST',
  correlation_id: 'abc-123'
}
```

### Custom Message Reporting

Report custom messages or warnings to Sentry:

```typescript
@Injectable()
export class MonitoringService {
  constructor(private errorService: ErrorService) {}

  checkGatewayHealth() {
    const avgDelay = this.getAverageDelay();

    if (avgDelay > 2000) {
      // Report warning to Sentry
      this.errorService.reportMessage(
        'Payment gateway experiencing delays',
        'warning',
        {
          gateway: 'stripe',
          averageDelay: avgDelay,
          threshold: 2000,
          affectedRequests: 15,
        },
      );
    }
  }
}
```

### Sensitive Data Sanitization

The ErrorService automatically sanitizes sensitive data before sending to Sentry:

**Sanitized Fields:**

- `password`
- `token`
- `apiKey`
- `secret`
- `creditCard`
- `ssn`
- `connectionString`
- `authorization`
- `cookie`

**Example:**

```typescript
const context = {
  userId: '123',
  password: 'secret123', // Will be redacted
  email: 'user@example.com',
};

service.logError(error, context);
// Logs: { userId: '123', password: '***REDACTED***', email: 'user@example.com' }

await service.reportError(error, context);
// Sent to Sentry: { userId: '123', password: '***REDACTED***', email: 'user@example.com' }
```

### Filtering Errors

You can filter what gets sent to Sentry by configuring notification strategy:

```typescript
ErrorModule.register({
  enableSentry: true,
  notificationStrategy: ErrorNotificationStrategy.CRITICAL, // Only critical
});
```

Or implement custom filtering in Sentry's `beforeSend`:

```typescript
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  beforeSend(event, hint) {
    // Don't send validation errors to Sentry
    if (hint.originalException?.code?.startsWith('ERR_2')) {
      return null;
    }
    return event;
  },
});
```

### Best Practices for Error Handling in Applications

1. **Use severity levels appropriately**

   ```typescript
   // Good
   throw new AppError(
     ERROR_CODES.VALIDATION_ERROR,
     msg,
     ctx,
     ErrorSeverity.LOW,
   );

   // Bad - validation error shouldn't be CRITICAL
   throw AppError.critical(ERROR_CODES.VALIDATION_ERROR, msg);
   ```

2. **Add meaningful context**

   ```typescript
   // Good
   throw new AppError(ERROR_CODES.PAYMENT_FAILED, 'Payment failed', {
     amount: 100,
     currency: 'USD',
     gateway: 'stripe',
     attemptNumber: 3,
   });

   // Bad - no context
   throw new AppError(ERROR_CODES.PAYMENT_FAILED);
   ```

3. **Use reportMessage for monitoring**

   ```typescript
   // Monitor thresholds
   if (queueLength > 1000) {
     errorService.reportMessage('Queue threshold exceeded', 'warning', {
       queueLength,
       threshold: 1000,
     });
   }
   ```

4. **Never log sensitive data**

   ```typescript
   // Good - sensitive data automatically sanitized
   errorService.reportError(error, { userId, password }); // password redacted

   // Bad - exposing in message
   throw new AppError(ERROR_CODES.AUTH_FAILED, `Failed with password: ${pwd}`);
   ```

5. **Log full details server-side, show generic messages to users**

   ```typescript
   // Good
   errorService.logError(error, { userId, action: 'payment' });
   throw new AppError(ERROR_CODES.PAYMENT_FAILED, 'Payment failed');

   // Bad - exposing internal details
   throw new AppError(
     ERROR_CODES.PAYMENT_FAILED,
     `Failed with error: ${error.message}`,
   );
   ```

6. **Review Sentry reports regularly for accidentally leaked data**

   ```typescript
   // Good
   Sentry.init({
     beforeSend(event) {
       // Remove PII
       if (event.user) {
         delete event.user.email;
         delete event.user.ip_address;
       }
       return event;
     },
   });
   ```

7. **Configure Sentry data scrubbing rules**

   ```typescript
   // Good
   Sentry.init({
     dsn: process.env.SENTRY_DSN,
     beforeSend(event) {
       // Remove PII
       if (event.user) {
         delete event.user.email;
         delete event.user.ip_address;
       }
       return event;
     },
   });
   ```

---

## Security and Error Handling

### Sensitive Data Sanitization (SAEH)

The ErrorService automatically redacts sensitive fields before logging or reporting to Sentry:

**Sanitized Fields:**

- `password`
- `token`
- `apiKey`
- `secret`
- `creditCard`
- `ssn`
- `connectionString`
- `authorization`
- `cookie`

**Example:**

```typescript
const context = {
  userId: '123',
  password: 'secret123', // Will be redacted
  email: 'user@example.com',
};

service.logError(error, context);
// Logs: { userId: '123', password: '***REDACTED***', email: 'user@example.com' }

await service.reportError(error, context);
// Sent to Sentry: { userId: '123', password: '***REDACTED***', email: 'user@example.com' }
```

### Security: Stack Trace Control

**Never expose stack traces in production:**

```typescript
ErrorModule.register({
  includeStackTrace: process.env.NODE_ENV === 'development', // Only in dev
});
```

### Security: Error Message Safety

**Bad (exposes internals):**

```typescript
throw new AppError(
  ERROR_CODES.DATABASE_ERROR,
  `Query failed: SELECT * FROM users WHERE password = '${password}'`,
);
```

**Good (generic, safe):**

```typescript
throw new AppError(
  ERROR_CODES.DATABASE_ERROR,
  'Database operation failed',
  { operation: 'user_query' }, // No sensitive details
);
```

### Security: Sentry Data Privacy

**Best practices for Sentry:**

1. **Use beforeSend to scrub data:**

   ```typescript
   Sentry.init({
     beforeSend(event) {
       // Remove PII
       if (event.user) {
         delete event.user.email;
         delete event.user.ip_address;
       }
       return event;
     },
   });
   ```

2. **Enable Data Scrubbing in Sentry dashboard:**
   - Go to Settings > Security & Privacy
   - Enable "Data Scrubbing"
   - Add custom regex patterns

3. **Use environment variables for sensitive config:**

   ```typescript
   // Good
   dsn: process.env.SENTRY_DSN;

   // Bad
   dsn: 'https://public-key@sentry.io/project-id';
   ```

### Best Practices for Error Handling in Applications ()

1. **Never** include passwords, tokens, or PII in error messages
2. **Always** set `includeStackTrace: false` in production
3. **Use** specific error codes instead of exposing internal details
4. **Sanitize** user input before including in context
5. **Log** full details server-side, show generic messages to users
6. **Review** Sentry reports regularly for accidentally leaked data
7. **Configure** Sentry data scrubbing rules

---

## Testing

### Run Tests

```bash
# Unit tests
pnpm test app-error.class.spec.ts
pnpm test validation-error.class.spec.ts
pnpm test business-error.class.spec.ts
pnpm test error.service.spec.ts
pnpm test app-error.filter.spec.ts

# Integration tests
pnpm test error.integration.spec.ts

# All error tests
pnpm test src/modules/shared/error

# With coverage
pnpm test -- --coverage src/modules/shared/error
```

### Test Coverage

```text
Test Suites: 9 passed, 9 total
Tests:       201 passed, 201 total
Snapshots:   0 total
Time:        ~8s
```

### Testing Error Reporting

Mock Sentry in your tests:

```typescript
import * as Sentry from '@sentry/nestjs';

jest.mock('@sentry/nestjs', () => ({
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  withScope: jest.fn((callback) => {
    const mockScope = {
      setLevel: jest.fn(),
      setTag: jest.fn(),
      setContext: jest.fn(),
    };
    callback(mockScope);
  }),
}));

describe('Error Reporting', () => {
  it('should report critical errors to Sentry', async () => {
    const error = AppError.critical(
      ERROR_CODES.DATABASE_ERROR,
      'Connection failed',
    );

    await errorService.reportError(error);

    expect(Sentry.captureException).toHaveBeenCalledWith(error);
    expect(Sentry.withScope).toHaveBeenCalled();
  });

  it('should add proper tags to Sentry', async () => {
    const error = new AppError(ERROR_CODES.VALIDATION_ERROR, 'Invalid input', {
      field: 'email',
    });

    await errorService.reportError(error);

    const scopeCallback = (Sentry.withScope as jest.Mock).mock.calls[0][0];
    const mockScope = {
      setLevel: jest.fn(),
      setTag: jest.fn(),
      setContext: jest.fn(),
    };

    scopeCallback(mockScope);

    expect(mockScope.setTag).toHaveBeenCalledWith('error_code', error.code);
    expect(mockScope.setTag).toHaveBeenCalledWith('is_operational', 'true');
    expect(mockScope.setTag).toHaveBeenCalledWith('severity', error.severity);
  });
});
```

### Writing Tests

```typescript
import { Test } from '@nestjs/testing';
import { ErrorModule } from './error.module';
import { ErrorService } from './error.service';

describe('My Feature', () => {
  let service: ErrorService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [
        ErrorModule.register({
          includeStackTrace: true,
          notifyFrontend: false, // Disable in tests
          logErrors: false, // Quiet tests
          enableSentry: false, // No Sentry in tests
        }),
      ],
    }).compile();

    service = module.get(ErrorService);
  });

  it('should throw AppError when resource not found', async () => {
    await expect(myService.getResource('invalid-id')).rejects.toThrow(AppError);
  });

  it('should have correct error code', async () => {
    try {
      await myService.getResource('invalid-id');
    } catch (error) {
      expect(error.code).toBe(ERROR_CODES.RESOURCE_NOT_FOUND);
    }
  });
});
```

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Errors Not Being Caught

**Problem:** Errors bypass the global filter

**Solution:**

```typescript
// Ensure ErrorModule is imported in AppModule
@Module({
  imports: [
    ErrorModule.register(), // ✅ This registers the global filter
  ],
})
export class AppModule {}
```

#### 2. Notifications Not Sent

**Problem:** Frontend doesn't receive error notifications

**Solutions:**

```typescript
// 1. Check NotificationModule is imported first
@Module({
  imports: [
    NotificationModule.register(),  // ✅ First
    ErrorModule.register(),          // ✅ Then this
  ],
})

// 2. Verify error is operational
throw new AppError(code, message, context, severity, true); // ✅ true = operational

// 3. Check notification strategy
ErrorModule.register({
  notifyFrontend: true,  // ✅ Must be true
  notificationStrategy: ErrorNotificationStrategy.OPERATIONAL,  // ✅ Or ALL
});
```

#### 3. Stack Traces in Production

**Problem:** Stack traces exposed to users

**Solution:**

```typescript
ErrorModule.register({
  includeStackTrace: process.env.NODE_ENV === 'development', // ✅ Only in dev
});
```

#### 4. Validation Errors Not Formatted

**Problem:** NestJS validation errors return generic messages

**Solution:**

The module automatically handles `BadRequestException` (which NestJS uses for validation errors). Ensure you're using the global `ValidationPipe`:

```typescript
// main.ts
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
  }),
);
```

#### 5. TypeScript Errors

**Problem:** Cannot find module '@/modules/shared/error'

**Solution:**

```typescript
// Use correct import path
import { AppError, ERROR_CODES } from './modules/shared/error';

// Or configure path alias in tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

#### 6. Sentry Not Reporting Errors (Sentry Module)

**Problem:** Errors not appearing in Sentry dashboard

**Solutions:**

```typescript
// 1. Verify Sentry is initialized
// In main.ts, BEFORE app creation
Sentry.init({
  dsn: process.env.SENTRY_DSN, // ✅ Check DSN is set
  environment: process.env.NODE_ENV,
});

// 2. Check enableSentry is true
ErrorModule.register({
  enableSentry: true, // ✅ Must be true
});

// 3. Verify DSN is valid
console.log('Sentry DSN:', process.env.SENTRY_DSN);

// 4. Test manually
Sentry.captureMessage('Test from bootstrap');
```

#### 7. Sentry Reporting Too Many Errors

**Problem:** Sentry quota exceeded with validation errors

**Solution:**

```typescript
// Filter out low-severity errors
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  beforeSend(event, hint) {
    // Don't send validation errors (2000-2999)
    if (hint.originalException?.code?.startsWith('ERR_2')) {
      return null;
    }
    return event;
  },
});

// Or adjust notification strategy
ErrorModule.register({
  enableSentry: true,
  notificationStrategy: ErrorNotificationStrategy.CRITICAL, // Only critical
});
```

---

## 📊 Error Response Format

All errors return this standardized format:

```typescript
{
  status: 'error',
  code: 'ERR_4001',
  message: 'Project not found',
  context: {
    projectId: '123'
  },
  timestamp: '2025-11-18T12:00:00Z',
  path: '/api/projects/123',
  method: 'GET',
  correlationId: 'corr-abc-123',
  stack: '...'  // Only in development
}
```

### Special Cases

#### Validation Errors

```typescript
{
  status: 'error',
  code: 'ERR_2000',
  message: [
    'email must be an email',
    'name should not be empty'
  ],  // Array of validation messages
  timestamp: '2025-11-18T12:00:00Z',
  path: '/api/users',
  method: 'POST'
}
```

---

## 🔄 Migration Guide

### From Previous Version

If you're upgrading from an older version of this module, here are the key changes:

#### 1. Removed Redundant Processing

**Before:**

```typescript
// Filter had duplicate error processing logic
```

**After:**

```typescript
// Filter now uses ErrorService.processError() as single source of truth
const errorResponse = this.errorService.processError(rawException, req);
```

#### 2. Improved Validation Handling

**Before:**

```typescript
// Validation errors were processed generically
```

**After:**

```typescript
// Special handling for BadRequestException preserves validation messages
if (rawException instanceof BadRequestException) {
  return this.handleValidationError(rawException, req, res);
}
```

#### 3. Better HTTP Status Mapping

**Before:**

```typescript
// Status codes sometimes incorrect for HttpException
```

**After:**

```typescript
// Proper extraction based on exception type
private extractStatusCode(exception: unknown, errorCode: ErrorCode): number {
  if (exception instanceof HttpException) {
    return exception.getStatus();
  }
  // ... AppError mapping
}
```

#### 4. Sentry Integration Added

**New in this version:**

```typescript
// Automatic reporting via decorator
@SentryExceptionCaptured()
catch(exception: unknown, host: ArgumentsHost) {
  // ...
}

// New methods
errorService.reportError(error, context);
errorService.reportMessage(message, level, context);
```

**Migration steps:**

1. Install Sentry dependencies:

   ```bash
   pnpm add @sentry/nestjs @sentry/profiling-node
   ```

2. Initialize Sentry in `main.ts`:

   ```typescript
   import * as Sentry from '@sentry/nestjs';

   Sentry.init({
     dsn: process.env.SENTRY_DSN,
     // ... config
   });
   ```

3. Enable in ErrorModule config:

   ```typescript
   ErrorModule.register({
     enableSentry: process.env.NODE_ENV === 'production',
     // ... other config
   });
   ```

---

## 🎯 Best Practices

1. ✅ **Use specific error codes** - Makes debugging easier
2. ✅ **Include relevant context** - But sanitize sensitive data
3. ✅ **Use appropriate error classes** - AppError, ValidationError, BusinessError
4. ✅ **Mark errors as operational** - `isOperational: true` for expected errors
5. ✅ **Set appropriate severity** - LOW, MEDIUM, HIGH, CRITICAL
6. ✅ **Never expose internal details** - Use generic messages for users
7. ✅ **Test error paths** - Don't just test happy paths
8. ✅ **Log comprehensive details** - But only server-side
9. ✅ **Monitor error rates** - Track and alert on spikes via Sentry
10. ✅ **Document custom error codes** - Keep this README updated
11. ✅ **Use Sentry wisely** - Filter out noise, focus on actionable errors
12. ✅ **Review Sentry regularly** - Check for patterns and recurring issues

---

## 📞 Support

For issues, questions, or contributions:

- **Issues:** [GitHub Issues](https://github.com/your-repo/issues)
- **Documentation:** This README
- **Email:** [support@your-domain.com](mailto:support@your-domain.com)
- **Sentry Dashboard:** [Your Sentry Project](https://sentry.io/organizations/your-org/projects/your-project/)

---

## 📄 License

This module is [MIT licensed](LICENSE).

---

## 🙏 Acknowledgments

Built with:

- [NestJS](https://nestjs.com/)
- [class-validator](https://github.com/typestack/class-validator)
- [UUID v9](https://www.npmjs.com/package/uuid)
- [Sentry](https://sentry.io/)

---

**Last Updated:** December 2025  
**Module Version:** 2.0.0  
**Test Coverage:** 201/201 tests passing (100%)  
**Sentry Integration:** ✅ Fully Integrated
