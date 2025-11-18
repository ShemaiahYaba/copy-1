# Error Module

A production-ready, unified error handling system for NestJS applications. Provides standardized error responses, automatic frontend notifications, and comprehensive error tracking with security-first design.

## 📋 Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Error Codes Reference](#error-codes-reference)
- [Configuration](#configuration)
- [Error Classes Guide](#error-classes-guide)
- [Usage Examples](#usage-examples)
- [API Documentation](#api-documentation)
- [Security Considerations](#security-considerations)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

---

## ✨ Features

- **Unified Error Handling** - Global exception filter catches all errors
- **Standardized Error Responses** - Consistent error format across the application
- **Automatic Frontend Notifications** - Integrates with NotificationModule for real-time error alerts
- **Type-Safe Error Codes** - Centralized error code system with automatic message mapping
- **Security-First** - Automatic sensitive data sanitization
- **Configurable Behavior** - Control stack traces, logging, and notification strategies
- **Multiple Error Types** - AppError, ValidationError, BusinessError for different use cases
- **HTTP Status Mapping** - Automatic mapping of error codes to appropriate HTTP status codes
- **External Error Tracking** - Sentry integration support for critical errors
- **Full TypeScript Support** - Comprehensive type definitions
- **Extensive Test Coverage** - >85% coverage with unit and integration tests

---

## 📦 Installation

### Required Dependencies

All dependencies should already be installed as part of your NestJS project:

```bash
pnpm add @nestjs/common class-validator class-transformer uuid@9
```

### Development Dependencies

```bash
pnpm add -D @types/uuid
```

---

## 🚀 Quick Start

### 1. Import the Module

In your `app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ErrorModule } from './modules/shared/error';
import { NotificationModule } from './modules/shared/notification';
import { ErrorNotificationStrategy } from './modules/shared/error/dto/error-config.dto';

@Module({
  imports: [
    // Import NotificationModule first (ErrorModule depends on it)
    NotificationModule.register({
      adapter: 'websocket',
      persist: true,
      enableLogging: false,
    }),

    // Then ErrorModule
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
```

### 2. Use in Services

```typescript
import { Injectable } from '@nestjs/common';
import { AppError, ERROR_CODES } from '@/modules/shared/error';

@Injectable()
export class ProjectService {
  async getProject(id: string) {
    const project = await this.projectRepo.findOne(id);

    if (!project) {
      throw new AppError(ERROR_CODES.RESOURCE_NOT_FOUND, 'Project not found', {
        projectId: id,
      });
    }

    return project;
  }
}
```

### 3. Frontend Receives Notifications

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

---

## 📖 Error Codes Reference

### General Errors (1000-1999)

| Code       | Message                           | HTTP Status |
| ---------- | --------------------------------- | ----------- |
| `ERR_1000` | An internal server error occurred | 500         |
| `ERR_1001` | An unknown error occurred         | 500         |
| `ERR_1002` | Service temporarily unavailable   | 503         |
| `ERR_1003` | Request timeout                   | 408         |

### Validation Errors (2000-2999)

| Code       | Message                          | HTTP Status |
| ---------- | -------------------------------- | ----------- |
| `ERR_2000` | Validation failed                | 400         |
| `ERR_2001` | Invalid input provided           | 400         |
| `ERR_2002` | Required field is missing        | 400         |
| `ERR_2003` | Invalid format                   | 400         |
| `ERR_2004` | Value is out of acceptable range | 400         |

### Authentication Errors (3000-3999)

| Code       | Message                          | HTTP Status |
| ---------- | -------------------------------- | ----------- |
| `ERR_3000` | Unauthorized access              | 401         |
| `ERR_3001` | Invalid authentication token     | 401         |
| `ERR_3002` | Authentication token has expired | 401         |
| `ERR_3003` | Insufficient permissions         | 403         |
| `ERR_3004` | Invalid credentials              | 401         |

### Resource Errors (4000-4999)

| Code       | Message                      | HTTP Status |
| ---------- | ---------------------------- | ----------- |
| `ERR_4000` | Resource not found           | 404         |
| `ERR_4001` | Requested resource not found | 404         |
| `ERR_4002` | Resource already exists      | 409         |
| `ERR_4003` | Resource conflict            | 409         |

### Business Logic Errors (5000-5999)

| Code       | Message                     | HTTP Status |
| ---------- | --------------------------- | ----------- |
| `ERR_5000` | Business rule violation     | 422         |
| `ERR_5001` | Invalid state for operation | 422         |
| `ERR_5002` | Operation not allowed       | 403         |
| `ERR_5003` | Quota exceeded              | 429         |

### External Service Errors (6000-6999)

| Code       | Message                | HTTP Status |
| ---------- | ---------------------- | ----------- |
| `ERR_6000` | External service error | 500         |
| `ERR_6001` | API request failed     | 500         |
| `ERR_6002` | Database error         | 500         |
| `ERR_6003` | Cache error            | 500         |

---

## ⚙️ Configuration

### Configuration Options

```typescript
export class ErrorConfigDto {
  includeStackTrace: boolean; // Show stack traces (dev only)
  notifyFrontend: boolean; // Send error notifications
  notificationStrategy: enum; // When to notify (ALL, OPERATIONAL, CRITICAL, NONE)
  logErrors: boolean; // Log errors
  captureContext: boolean; // Include request context
  enableSentry?: boolean; // External error tracking
}
```

### Configuration Examples

#### Development Setup

```typescript
ErrorModule.register({
  includeStackTrace: true, // Show full stack traces
  notifyFrontend: true, // Notify on all errors
  notificationStrategy: ErrorNotificationStrategy.ALL,
  logErrors: true, // Verbose logging
  captureContext: true,
  enableSentry: false, // No external tracking in dev
});
```

#### Production Setup

```typescript
ErrorModule.register({
  includeStackTrace: false, // Hide stack traces
  notifyFrontend: true,
  notificationStrategy: ErrorNotificationStrategy.OPERATIONAL,
  logErrors: true,
  captureContext: true,
  enableSentry: true, // Report to Sentry
});
```

#### Testing Setup

```typescript
ErrorModule.register({
  includeStackTrace: true,
  notifyFrontend: false, // No notifications in tests
  notificationStrategy: ErrorNotificationStrategy.NONE,
  logErrors: false, // Quiet tests
});
```

---

## 📚 Error Classes Guide

### AppError

**When to use:** General application errors, resource errors, authentication errors

```typescript
// Basic usage
throw new AppError(ERROR_CODES.NOT_FOUND, 'Project not found');

// With context
throw new AppError(ERROR_CODES.UNAUTHORIZED, 'Access denied', {
  userId: '123',
  resource: 'project',
});

// High severity
throw AppError.high(ERROR_CODES.DATABASE_ERROR, 'Database connection failed');

// Critical error (non-operational)
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

---

## 💡 Usage Examples

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
  async processPayment(amount: number) {
    try {
      await this.paymentGateway.charge(amount);
    } catch (error) {
      throw AppError.critical(
        ERROR_CODES.EXTERNAL_SERVICE_ERROR,
        'Payment processing failed',
        {
          amount,
          gateway: 'stripe',
          originalError: error.message,
        },
      );
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
}
```

---

## 📖 API Documentation

### AppError Class

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
AppError.critical(code, message?, context?)  // CRITICAL severity
```

#### Instance Methods

```typescript
error.toJSON(): IErrorResponse  // Convert to JSON format
```

### ValidationError Class

#### Constructor

```typescript
new ValidationError(
  errors: ValidationErrorDetail[],
  message?: string
)
```

#### Static Methods

```typescript
ValidationError.fromValidationErrors(classValidatorErrors);
```

### BusinessError Class

#### Constructor

```typescript
new BusinessError(message: string, context?: Record<string, any>)
```

#### Static Methods

```typescript
BusinessError.invalidState(message, context?)
BusinessError.notAllowed(operation, reason?)
```

### ErrorService Methods

```typescript
processError(error, request?): ErrorResponseDto
shouldNotify(error): boolean
logError(error, context?): void
reportError(error, context?): Promise<void>
createError(code, message?, context?): AppError
```

---

## 🔒 Security Considerations

### Sensitive Data Sanitization

The ErrorService automatically redacts sensitive fields:

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
```

### Stack Trace Control

**Never expose stack traces in production:**

```typescript
// Production
ErrorModule.register({
  includeStackTrace: false, // ✅ Safe
});

// Development
ErrorModule.register({
  includeStackTrace: true, // ✅ OK for debugging
});
```

### Error Message Safety

**❌ Bad (exposes internals):**

```typescript
throw new AppError(
  ERROR_CODES.DATABASE_ERROR,
  `Query failed: SELECT * FROM users WHERE password = '${password}'`,
);
```

**✅ Good (generic, safe):**

```typescript
throw new AppError(
  ERROR_CODES.DATABASE_ERROR,
  'Database operation failed',
  { operation: 'user_query' }, // No sensitive details
);
```

### Best Practices

1. ✅ **Never** include passwords, tokens, or PII in error messages
2. ✅ **Always** set `includeStackTrace: false` in production
3. ✅ **Use** specific error codes instead of exposing internal details
4. ✅ **Sanitize** user input before including in context
5. ✅ **Log** full details server-side, show generic messages to users

---

## 🧪 Testing

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
pnpm test error

# With coverage
pnpm test -- --coverage error
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

#### 4. TypeScript Errors

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
9. ✅ **Monitor error rates** - Track and alert on spikes
10. ✅ **Document custom error codes** - Keep this README updated

---

## 📞 Support

For issues, questions, or contributions:

- **Issues:** [GitHub Issues](https://github.com/your-repo/issues)
- **Documentation:** This README
- **Email:** support@your-domain.com

---

## 📄 License

This module is [MIT licensed](LICENSE).

---

## 🙏 Acknowledgments

Built with:

- [NestJS](https://nestjs.com/)
- [class-validator](https://github.com/typestack/class-validator)
- [UUID v9](https://www.npmjs.com/package/uuid)

---

**Last Updated:** November 2025  
**Module Version:** 1.0.0
