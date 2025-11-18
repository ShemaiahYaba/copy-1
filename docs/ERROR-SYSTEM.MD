# Error Module - Build Specification

## 🎯 Module Purpose

Provide a unified error handling system that catches, formats, and standardizes all errors across the application. Integrates with the Notification Module to automatically notify users of errors through the frontend, ensuring consistent error responses and improved user experience.

---

## 📦 Module Overview

**Name:** `ErrorModule`  
**Type:** Core Module (Global Exception Filter)  
**Dependencies:** `@nestjs/common`, `uuid`, `NotificationModule`

---

## 🏗️ File Structure

```
src/error/
├── dto/
│   ├── error-response.dto.ts           # Standardized error response shape
│   ├── error-config.dto.ts             # Module configuration
│   └── index.ts                        # Barrel export
├── types/
│   ├── error.type.ts                   # GraphQL type (if using GraphQL)
│   └── index.ts
├── interfaces/
│   ├── error.interface.ts              # Core error contracts
│   └── index.ts
├── classes/
│   ├── app-error.class.ts              # Custom error class
│   ├── validation-error.class.ts       # Validation-specific errors
│   ├── business-error.class.ts         # Business logic errors
│   └── index.ts
├── filters/
│   ├── app-error.filter.ts             # Global exception filter
│   ├── http-exception.filter.ts        # HTTP-specific filter
│   └── index.ts
├── constants/
│   ├── error-codes.constant.ts         # Standardized error codes
│   └── index.ts
├── error.service.ts                    # Error handling service
├── error.module.ts                     # Module definition
├── __tests__/
│   ├── app-error.class.spec.ts         # Unit tests for error classes
│   ├── app-error.filter.spec.ts        # Unit tests for filters
│   ├── error.service.spec.ts           # Unit tests for service
│   └── error.integration.spec.ts       # Integration tests
└── README.md                           # Module documentation
```

---

## 📋 Core Components Specification

### 1. **Error Interface**

**File:** `interfaces/error.interface.ts`

```typescript
export enum ErrorSeverity {
  LOW = 'LOW', // Informational, non-blocking
  MEDIUM = 'MEDIUM', // Warning, may impact UX
  HIGH = 'HIGH', // Critical, blocks functionality
  CRITICAL = 'CRITICAL', // System-level failure
}

export interface IErrorResponse {
  status: 'error';
  code: string;
  message: string;
  details?: string;
  context?: Record<string, any>;
  timestamp: Date;
  path?: string;
  method?: string;
  correlationId?: string;
  stack?: string; // Only in development
}

export interface IAppError {
  code: string;
  message: string;
  severity: ErrorSeverity;
  context?: Record<string, any>;
  isOperational: boolean; // true = expected error, false = programmer error
}
```

**Purpose:** Define contracts for error handling  
**Used by:** Error classes, filters, service

---

### 2. **Error Codes Constants**

**File:** `constants/error-codes.constant.ts`

```typescript
export const ERROR_CODES = {
  // General Errors (1000-1999)
  INTERNAL_SERVER_ERROR: 'ERR_1000',
  UNKNOWN_ERROR: 'ERR_1001',
  SERVICE_UNAVAILABLE: 'ERR_1002',
  TIMEOUT: 'ERR_1003',

  // Validation Errors (2000-2999)
  VALIDATION_ERROR: 'ERR_2000',
  INVALID_INPUT: 'ERR_2001',
  MISSING_REQUIRED_FIELD: 'ERR_2002',
  INVALID_FORMAT: 'ERR_2003',
  OUT_OF_RANGE: 'ERR_2004',

  // Authentication Errors (3000-3999)
  UNAUTHORIZED: 'ERR_3000',
  INVALID_TOKEN: 'ERR_3001',
  TOKEN_EXPIRED: 'ERR_3002',
  INSUFFICIENT_PERMISSIONS: 'ERR_3003',
  INVALID_CREDENTIALS: 'ERR_3004',

  // Resource Errors (4000-4999)
  NOT_FOUND: 'ERR_4000',
  RESOURCE_NOT_FOUND: 'ERR_4001',
  ALREADY_EXISTS: 'ERR_4002',
  CONFLICT: 'ERR_4003',

  // Business Logic Errors (5000-5999)
  BUSINESS_RULE_VIOLATION: 'ERR_5000',
  INVALID_STATE: 'ERR_5001',
  OPERATION_NOT_ALLOWED: 'ERR_5002',
  QUOTA_EXCEEDED: 'ERR_5003',

  // External Service Errors (6000-6999)
  EXTERNAL_SERVICE_ERROR: 'ERR_6000',
  API_REQUEST_FAILED: 'ERR_6001',
  DATABASE_ERROR: 'ERR_6002',
  CACHE_ERROR: 'ERR_6003',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

// Human-readable error messages
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ERROR_CODES.INTERNAL_SERVER_ERROR]: 'An internal server error occurred',
  [ERROR_CODES.UNKNOWN_ERROR]: 'An unknown error occurred',
  [ERROR_CODES.SERVICE_UNAVAILABLE]: 'Service temporarily unavailable',
  [ERROR_CODES.TIMEOUT]: 'Request timeout',

  [ERROR_CODES.VALIDATION_ERROR]: 'Validation failed',
  [ERROR_CODES.INVALID_INPUT]: 'Invalid input provided',
  [ERROR_CODES.MISSING_REQUIRED_FIELD]: 'Required field is missing',
  [ERROR_CODES.INVALID_FORMAT]: 'Invalid format',
  [ERROR_CODES.OUT_OF_RANGE]: 'Value is out of acceptable range',

  [ERROR_CODES.UNAUTHORIZED]: 'Unauthorized access',
  [ERROR_CODES.INVALID_TOKEN]: 'Invalid authentication token',
  [ERROR_CODES.TOKEN_EXPIRED]: 'Authentication token has expired',
  [ERROR_CODES.INSUFFICIENT_PERMISSIONS]: 'Insufficient permissions',
  [ERROR_CODES.INVALID_CREDENTIALS]: 'Invalid credentials',

  [ERROR_CODES.NOT_FOUND]: 'Resource not found',
  [ERROR_CODES.RESOURCE_NOT_FOUND]: 'Requested resource not found',
  [ERROR_CODES.ALREADY_EXISTS]: 'Resource already exists',
  [ERROR_CODES.CONFLICT]: 'Resource conflict',

  [ERROR_CODES.BUSINESS_RULE_VIOLATION]: 'Business rule violation',
  [ERROR_CODES.INVALID_STATE]: 'Invalid state for operation',
  [ERROR_CODES.OPERATION_NOT_ALLOWED]: 'Operation not allowed',
  [ERROR_CODES.QUOTA_EXCEEDED]: 'Quota exceeded',

  [ERROR_CODES.EXTERNAL_SERVICE_ERROR]: 'External service error',
  [ERROR_CODES.API_REQUEST_FAILED]: 'API request failed',
  [ERROR_CODES.DATABASE_ERROR]: 'Database error',
  [ERROR_CODES.CACHE_ERROR]: 'Cache error',
};
```

**Purpose:** Centralized error codes and messages  
**Benefits:**

- Consistent error codes across application
- Easy to document for frontend
- Supports i18n (can map codes to translations)

---

### 3. **AppError Class**

**File:** `classes/app-error.class.ts`

```typescript
import { ErrorSeverity, IAppError } from '../interfaces/error.interface';
import { ErrorCode, ERROR_MESSAGES } from '../constants/error-codes.constant';

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
    this.severity = severity;
    this.context = context;
    this.isOperational = isOperational;
    this.timestamp = new Date();

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);

    // Set the prototype explicitly
    Object.setPrototypeOf(this, AppError.prototype);
  }

  /**
   * Convert error to JSON format
   */
  toJSON(): IErrorResponse {
    return {
      status: 'error',
      code: this.code,
      message: this.message,
      context: this.context,
      timestamp: this.timestamp,
    };
  }

  /**
   * Create error with HIGH severity
   */
  static high(
    code: ErrorCode,
    message?: string,
    context?: Record<string, any>,
  ): AppError {
    return new AppError(code, message, context, ErrorSeverity.HIGH);
  }

  /**
   * Create error with CRITICAL severity
   */
  static critical(
    code: ErrorCode,
    message?: string,
    context?: Record<string, any>,
  ): AppError {
    return new AppError(code, message, context, ErrorSeverity.CRITICAL, false);
  }
}
```

**Purpose:** Base error class for all application errors  
**Features:**

- Standardized error structure
- Severity levels
- Operational vs programmer error distinction
- Static factory methods for common cases

---

### 4. **ValidationError Class**

**File:** `classes/validation-error.class.ts`

```typescript
import { AppError } from './app-error.class';
import { ERROR_CODES } from '../constants/error-codes.constant';
import { ErrorSeverity } from '../interfaces/error.interface';

export interface ValidationErrorDetail {
  field: string;
  message: string;
  value?: any;
  constraint?: string;
}

export class ValidationError extends AppError {
  public readonly errors: ValidationErrorDetail[];

  constructor(errors: ValidationErrorDetail[], message?: string) {
    super(
      ERROR_CODES.VALIDATION_ERROR,
      message || 'Validation failed',
      { errors },
      ErrorSeverity.LOW,
      true,
    );

    this.errors = errors;
    Object.setPrototypeOf(this, ValidationError.prototype);
  }

  /**
   * Create from class-validator errors
   */
  static fromValidationErrors(validationErrors: any[]): ValidationError {
    const errors: ValidationErrorDetail[] = validationErrors.map((err) => ({
      field: err.property,
      message: Object.values(err.constraints || {}).join(', '),
      value: err.value,
      constraint: Object.keys(err.constraints || {})[0],
    }));

    return new ValidationError(errors);
  }
}
```

**Purpose:** Handle validation-specific errors  
**Use case:** DTO validation failures, input validation

---

### 5. **BusinessError Class**

**File:** `classes/business-error.class.ts`

```typescript
import { AppError } from './app-error.class';
import { ERROR_CODES } from '../constants/error-codes.constant';
import { ErrorSeverity } from '../interfaces/error.interface';

export class BusinessError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(
      ERROR_CODES.BUSINESS_RULE_VIOLATION,
      message,
      context,
      ErrorSeverity.MEDIUM,
      true,
    );

    Object.setPrototypeOf(this, BusinessError.prototype);
  }

  /**
   * Create error for invalid state
   */
  static invalidState(
    message: string,
    context?: Record<string, any>,
  ): BusinessError {
    return new BusinessError(message, { ...context, reason: 'invalid_state' });
  }

  /**
   * Create error for operation not allowed
   */
  static notAllowed(operation: string, reason?: string): BusinessError {
    return new BusinessError(`Operation '${operation}' is not allowed`, {
      operation,
      reason,
    });
  }
}
```

**Purpose:** Handle business logic violations  
**Use case:** Domain rules, workflow violations

---

### 6. **Error Config DTO**

**File:** `dto/error-config.dto.ts`

```typescript
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';

export enum ErrorNotificationStrategy {
  ALL = 'ALL', // Notify all errors
  OPERATIONAL = 'OPERATIONAL', // Only operational errors
  CRITICAL = 'CRITICAL', // Only critical errors
  NONE = 'NONE', // No notifications
}

export class ErrorConfigDto {
  @IsBoolean()
  includeStackTrace: boolean = false; // Only enable in dev

  @IsBoolean()
  notifyFrontend: boolean = true;

  @IsEnum(ErrorNotificationStrategy)
  notificationStrategy: ErrorNotificationStrategy =
    ErrorNotificationStrategy.OPERATIONAL;

  @IsBoolean()
  logErrors: boolean = true;

  @IsBoolean()
  captureContext: boolean = true; // Include request context

  @IsOptional()
  @IsBoolean()
  enableSentry?: boolean = false; // External error tracking
}
```

**Purpose:** Configure error handling behavior  
**Options:**

- Control stack trace inclusion (dev vs prod)
- Configure notification strategy
- Toggle logging and context capture

---

### 7. **Error Response DTO**

**File:** `dto/error-response.dto.ts`

```typescript
import { IErrorResponse } from '../interfaces/error.interface';
import { ErrorCode } from '../constants/error-codes.constant';

export class ErrorResponseDto implements IErrorResponse {
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

  /**
   * Create from AppError
   */
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

  /**
   * Create generic internal error
   */
  static internalError(message?: string): ErrorResponseDto {
    return new ErrorResponseDto({
      code: 'ERR_1000',
      message: message || 'Internal server error',
      timestamp: new Date(),
    });
  }
}
```

**Purpose:** Standardized error response shape  
**Used by:** Filters, controllers

---

### 8. **Error Service**

**File:** `error.service.ts`

#### **Responsibilities:**

1. Transform errors into standardized format
2. Determine notification strategy
3. Log errors appropriately
4. Integrate with external error tracking (Sentry, etc.)
5. Provide error creation helpers

#### **Public Methods:**

```typescript
@Injectable()
export class ErrorService {
  /**
   * Process and format error
   * @param error - Raw error
   * @param request - Request context
   * @returns Formatted error response
   */
  processError(error: any, request?: any): ErrorResponseDto;

  /**
   * Determine if error should notify frontend
   * @param error - Error to check
   * @returns true if should notify
   */
  shouldNotify(error: AppError): boolean;

  /**
   * Log error with appropriate severity
   * @param error - Error to log
   * @param context - Additional context
   */
  logError(error: any, context?: Record<string, any>): void;

  /**
   * Report error to external service (e.g., Sentry)
   * @param error - Error to report
   * @param context - Additional context
   */
  reportError(error: any, context?: Record<string, any>): Promise<void>;

  /**
   * Create operational error
   * @param code - Error code
   * @param message - Error message
   * @param context - Error context
   */
  createError(
    code: ErrorCode,
    message?: string,
    context?: Record<string, any>,
  ): AppError;
}
```

#### **Implementation Requirements:**

1. **Error Processing:**
   - Detect error type (AppError, HTTP, standard Error)
   - Extract relevant information
   - Include request context if available
   - Sanitize sensitive data

2. **Notification Logic:**
   - Check notification strategy from config
   - Respect error severity
   - Skip notification for certain error codes

3. **Logging:**
   - Use appropriate log level based on severity
   - Include correlation ID
   - Format consistently
   - Avoid logging sensitive data

4. **External Reporting:**
   - Send critical errors to Sentry (if enabled)
   - Include breadcrumbs and context
   - Rate limit to avoid spam

---

### 9. **AppError Filter**

**File:** `filters/app-error.filter.ts`

#### **Responsibilities:**

1. Catch all unhandled errors globally
2. Transform errors using ErrorService
3. Emit notifications for operational errors
4. Return standardized error response

#### **Implementation:**

```typescript
@Catch()
export class AppErrorFilter implements ExceptionFilter {
  constructor(
    private readonly errorService: ErrorService,
    private readonly notificationService: NotificationService,
    @Inject('ERROR_CONFIG') private readonly config: ErrorConfigDto,
  ) {}

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Process error
    const errorResponse = this.errorService.processError(exception, request);

    // Log error
    if (this.config.logErrors) {
      this.errorService.logError(exception, {
        path: request.url,
        method: request.method,
      });
    }

    // Notify frontend if operational error
    if (this.config.notifyFrontend && exception instanceof AppError) {
      if (this.errorService.shouldNotify(exception)) {
        this.notificationService
          .push({
            type: NotificationType.ERROR,
            message: exception.message,
            context: {
              code: exception.code,
              ...exception.context,
            },
          })
          .catch((err) => {
            // Don't let notification failure break error handling
            console.error('Failed to send error notification:', err);
          });
      }
    }

    // Report critical errors
    if (
      exception instanceof AppError &&
      exception.severity === ErrorSeverity.CRITICAL
    ) {
      this.errorService.reportError(exception, { request }).catch((err) => {
        console.error('Failed to report error:', err);
      });
    }

    // Determine HTTP status
    const status = this.getHttpStatus(exception);

    // Send response
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
    // Map error codes to HTTP status codes
    const mapping: Record<string, number> = {
      ERR_3000: 401, // UNAUTHORIZED
      ERR_3003: 403, // INSUFFICIENT_PERMISSIONS
      ERR_4000: 404, // NOT_FOUND
      ERR_4002: 409, // ALREADY_EXISTS
      ERR_2000: 400, // VALIDATION_ERROR
      // ... more mappings
    };
    return mapping[code] || 500;
  }
}
```

**Purpose:** Global error catcher and handler  
**Features:**

- Catches all errors
- Integrates with notification system
- Consistent error responses
- Smart HTTP status mapping

---

### 10. **Error Module**

**File:** `error.module.ts`

#### **Configuration:**

```typescript
@Global()
@Module({})
export class ErrorModule {
  static register(config?: ErrorConfigDto): DynamicModule {
    return {
      module: ErrorModule,
      imports: [NotificationModule],
      providers: [
        ErrorService,
        {
          provide: 'ERROR_CONFIG',
          useValue: config || new ErrorConfigDto(),
        },
        {
          provide: APP_FILTER,
          useClass: AppErrorFilter,
        },
      ],
      exports: [ErrorService],
    };
  }
}
```

**Purpose:** Wire up error handling system  
**Features:**

- Global module (available everywhere)
- Dynamic configuration
- Registers global filter automatically
- Integrates with NotificationModule

---

## 🧪 Test Specifications

### **Unit Tests: AppError Class**

**File:** `__tests__/app-error.class.spec.ts`

#### **Test Cases:**

1. **Error Creation**
   - ✓ Should create error with all properties
   - ✓ Should use default message if not provided
   - ✓ Should set default severity to MEDIUM
   - ✓ Should set isOperational to true by default
   - ✓ Should capture stack trace

2. **Static Factory Methods**
   - ✓ `high()` should create HIGH severity error
   - ✓ `critical()` should create CRITICAL severity error
   - ✓ `critical()` should set isOperational to false

3. **JSON Serialization**
   - ✓ `toJSON()` should return correct format
   - ✓ Should include all relevant fields
   - ✓ Should not include stack trace by default

4. **Error Codes**
   - ✓ Should accept valid error codes
   - ✓ Should map code to default message

---

### **Unit Tests: ValidationError Class**

**File:** `__tests__/validation-error.class.spec.ts`

#### **Test Cases:**

1. **Error Creation**
   - ✓ Should create with validation errors array
   - ✓ Should set correct error code
   - ✓ Should set LOW severity

2. **fromValidationErrors() Method**
   - ✓ Should convert class-validator errors
   - ✓ Should extract field, message, value
   - ✓ Should handle multiple validation errors
   - ✓ Should handle nested validation errors

---

### **Unit Tests: ErrorService**

**File:** `__tests__/error.service.spec.ts`

#### **Test Cases:**

1. **processError() Method**
   - ✓ Should process AppError correctly
   - ✓ Should process HttpException correctly
   - ✓ Should process standard Error correctly
   - ✓ Should include request context
   - ✓ Should sanitize sensitive data

2. **shouldNotify() Method**
   - ✓ Should return true for operational errors (strategy: OPERATIONAL)
   - ✓ Should return false for non-operational errors (strategy: OPERATIONAL)
   - ✓ Should return true for all errors (strategy: ALL)
   - ✓ Should return false for all errors (strategy: NONE)
   - ✓ Should return true only for critical (strategy: CRITICAL)

3. **logError() Method**
   - ✓ Should log with correct severity level
   - ✓ Should include context
   - ✓ Should include correlation ID
   - ✓ Should not log sensitive data

4. **reportError() Method**
   - ✓ Should call external service when enabled
   - ✓ Should not call when disabled
   - ✓ Should handle reporting failures gracefully

---

### **Unit Tests: AppErrorFilter**

**File:** `__tests__/app-error.filter.spec.ts`

#### **Test Cases:**

1. **Error Catching**
   - ✓ Should catch all exceptions
   - ✓ Should process error through ErrorService
   - ✓ Should return standardized response

2. **HTTP Status Mapping**
   - ✓ Should return 400 for validation errors
   - ✓ Should return 401 for auth errors
   - ✓ Should return 404 for not found errors
   - ✓ Should return 500 for internal errors

3. **Notification Integration**
   - ✓ Should emit notification for operational errors
   - ✓ Should not emit for non-operational errors
   - ✓ Should respect notification strategy config
   - ✓ Should not fail if notification fails

4. **Context Inclusion**
   - ✓ Should include request path and method
   - ✓ Should include correlation ID if available
   - ✓ Should include stack trace only in dev mode

5. **External Reporting**
   - ✓ Should report critical errors
   - ✓ Should not report low severity errors
   - ✓ Should not fail if reporting fails

---

### **Integration Tests**

**File:** `__tests__/error.integration.spec.ts`

#### **Test Cases:**

1. **End-to-End Error Flow**
   - ✓ Service throws AppError → Filter catches → Notification sent → Response returned
   - ✓ Response format matches ErrorResponseDto
   - ✓ Frontend receives error notification

2. **Validation Error Flow**
   - ✓ DTO validation fails → ValidationError created → Proper response
   - ✓ Frontend receives validation error details

3. **Business Error Flow**
   - ✓ Business rule violated → BusinessError thrown → Notification sent

4. **Configuration Impact**
   - ✓ Stack trace included when enabled
   - ✓ Notifications respect strategy setting
   - ✓ Logging works when enabled

5. **Multiple Error Types**
   - ✓ AppError handled correctly
   - ✓ HttpException handled correctly
   - ✓ Standard Error handled correctly
   - ✓ All return consistent format

---

## 📊 Test Data

### **Valid Error Scenarios:**

```typescript
// Operational error
throw new AppError(ERROR_CODES.RESOURCE_NOT_FOUND, 'Project not found', {
  projectId: '123',
});

// Validation error
throw new ValidationError([
  { field: 'email', message: 'Invalid email format', value: 'notanemail' },
  { field: 'age', message: 'Must be at least 18', value: 15 },
]);

// Business error
throw new BusinessError('Cannot delete project with active tasks', {
  projectId: '123',
  activeTasks: 5,
});

// Critical error
throw AppError.critical(ERROR_CODES.DATABASE_ERROR, 'Database connection lost');
```

### **Expected Response Formats:**

```typescript
// Operational error response
{
  status: 'error',
  code: 'ERR_4001',
  message: 'Project not found',
  context: { projectId: '123' },
  timestamp: '2025-11-18T12:00:00Z',
  path: '/projects/123',
  method: 'GET'
}

// Validation error response
{
  status: 'error',
  code: 'ERR_2000',
  message: 'Validation failed',
  context: {
    errors: [
      { field: 'email', message: 'Invalid email format' },
      { field: 'age', message: 'Must be at least 18' }
    ]
  },
  timestamp: '2025-11-18T12:00:00Z'
}
```

---

## 🔧 Configuration Examples

### **Development Setup:**

```typescript
ErrorModule.register({
  includeStackTrace: true,
  notifyFrontend: true,
  notificationStrategy: ErrorNotificationStrategy.ALL,
  logErrors: true,
  captureContext: true,
  enableSentry: false,
});
```

### **Production Setup:**

```typescript
ErrorModule.register({
  includeStackTrace: false,
  notifyFrontend: true,
  notificationStrategy: ErrorNotificationStrategy.OPERATIONAL,
  logErrors: true,
  captureContext: true,
  enableSentry: true,
});
```

### **Minimal Setup (Testing):**

```typescript
ErrorModule.register({
  includeStackTrace: true,
  notifyFrontend: false,
  notificationStrategy: ErrorNotificationStrategy.NONE,
  logErrors: false,
});
```

---

## 📝 Usage Examples

### **In a Service:**

```typescript
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

  async deleteProject(id: string) {
    const project = await this.getProject(id);

    if (project.tasks.length > 0) {
      throw new BusinessError('Cannot delete project with active tasks', {
        projectId: id,
        taskCount: project.tasks.length,
      });
    }

    await this.projectRepo.delete(id);
  }
}
```

### **In a Controller:**

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
    // AppError automatically caught by filter
    return this.projectService.getProject(id);
  }
}
```

### **Custom Error Handling:**

```typescript
@Injectable()
export class PaymentService {
  async processPayment(amount: number) {
    try {
      await this.paymentGateway.charge(amount);
    } catch (error) {
      // Wrap external errors
      throw AppError.critical(
        ERROR_CODES.EXTERNAL_SERVICE_ERROR,
        'Payment processing failed',
        { amount, originalError: error.message },
      );
    }
  }
}
```

---

## ✅ Acceptance Criteria

Module is complete when:

1. ✅ All error classes implemented with proper inheritance
2. ✅ Error codes centralized and documented
3. ✅ Global filter catches all errors
4. ✅ Errors integrate with notification system
5. ✅ Configuration options work as expected
6. ✅ All unit tests pass (>85% coverage)
7. ✅ Integration tests pass
8. ✅ Stack traces hidden in production
9. ✅ Sensitive data sanitized
10. ✅ README documents all error codes and usage

---

## 📦 Required Dependencies

```json
{
  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "uuid": "^9.0.0",
    "class-validator": "^0.14.0",
    "class-transformer": "^0.5.1"
  },
  "devDependencies": {
    "@types/uuid": "^9.0.0"
  }
}
```

---

## 🚀 Implementation Phases

### **Phase 1: Foundation (Day 1)**

- [ ] Create file structure
- [ ] Define error interfaces and enums
- [ ] Create error codes constants
- [ ] Define error classes (AppError, ValidationError, BusinessError)
- [ ] Write README with error code documentation

### **Phase 2: Error Service (Day 2)**

- [ ] Implement ErrorService
- [ ] Add error processing logic
- [ ] Add notification strategy logic
- [ ] Write service unit tests
- [ ] Add logging functionality

### **Phase 3: Global Filter (Day 3)**

- [ ] Implement AppErrorFilter
- [ ] Add HTTP status mapping
- [ ] Integrate with NotificationService
- [ ] Wire up global filter registration
- [ ] Write filter unit tests

### **Phase 4: Integration (Day 4)**

- [ ] Create dynamic module with config
- [ ] Write integration tests
- [ ] Test with NotificationModule
- [ ] Create example usage in controllers
- [ ] Test error → notification flow

### **Phase 5: Polish & Production Ready (Day 5)**

- [ ] Add external error tracking (Sentry integration)
- [ ] Add data sanitization
- [ ] Performance testing (error handling overhead)
- [ ] Security audit (sensitive data exposure)
- [ ] Documentation review

---

## 🎯 Success Metrics

- **Test Coverage:** >85%
- **Error Processing Time:** <10ms per error
- **Zero Leaked Sensitive Data:** No passwords, tokens, or PII in logs/responses
- **Notification Reliability:** >99.9% of operational errors trigger notifications
- **Stack Trace Control:** Never exposed in production

---

## 📚 Documentation Requirements

**README.md must include:**

1. **Quick Start Guide**
   - Installation
   - Basic configuration
   - First error example

2. **Error Code Reference**
   - Complete list of error codes
   - HTTP status mappings
   - When to use each code

3. **Error Classes Guide**
   - When to use AppError
   - When to use ValidationError
   - When to use BusinessError
   - How to create custom error classes

4. **Configuration Options**
   - All config parameters explained
   - Environment-specific examples
   - Best practices

5. **Usage Examples**
   - Common patterns
   - Integration with services
   - Custom error handling

6. **Troubleshooting**
   - Common issues
   - Debugging tips
   - FAQ

7. **Security Considerations**
   - Data sanitization
   - Stack trace exposure
   - Error logging best practices

---

## 🔒 Security Considerations

### **1. Sensitive Data Sanitization**

**Fields to sanitize in error context:**

- Passwords
- API keys
- Tokens (JWT, session, etc.)
- Credit card numbers
- Personal identifiable information (PII)
- Database connection strings

**Implementation:**

```typescript
private sanitizeContext(context?: Record<string, any>): Record<string, any> {
  if (!context) return {};

  const sensitiveKeys = [
    'password', 'token', 'apiKey', 'secret',
    'creditCard', 'ssn', 'connectionString'
  ];

  const sanitized = { ...context };

  for (const key of sensitiveKeys) {
    if (key in sanitized) {
      sanitized[key] = '***REDACTED***';
    }
  }

  return sanitized;
}
```

### **2. Stack Trace Exposure**

**Rules:**

- ❌ Never include stack traces in production responses
- ✅ Log stack traces server-side for debugging
- ✅ Include stack traces in development mode only
- ✅ Use config flag to control: `includeStackTrace`

### **3. Error Message Safety**

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

### **4. Rate Limiting Error Responses**

Consider rate limiting error responses to prevent:

- Brute force attacks
- Information disclosure through error messages
- Resource exhaustion

**Implementation idea:**

```typescript
// In filter, track error counts per IP/user
if (this.errorRateLimiter.isExceeded(clientIp)) {
  return response.status(429).json({
    status: 'error',
    code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
    message: 'Too many errors, please try again later',
  });
}
```

---

## 🔄 Integration with Other Modules

### **With NotificationModule:**

```typescript
// Automatic notification on operational errors
if (error.isOperational && this.shouldNotify(error)) {
  await this.notificationService.push({
    type: NotificationType.ERROR,
    message: error.message,
    context: this.sanitizeContext(error.context),
  });
}
```

### **With ContextModule (future):**

```typescript
// Include context metadata in errors
const contextMeta = this.contextService.getMeta();

const errorResponse = ErrorResponseDto.fromAppError(error, request);
errorResponse.correlationId = contextMeta.correlationId;
errorResponse.context = {
  ...error.context,
  userId: contextMeta.userId,
  orgId: contextMeta.orgId,
};
```

### **With LoggingModule (future):**

```typescript
// Structured error logging
this.logger.error({
  errorCode: error.code,
  message: error.message,
  severity: error.severity,
  correlationId: contextMeta.correlationId,
  stack: error.stack,
});
```

---

## 📊 Error Monitoring & Observability

### **Key Metrics to Track:**

1. **Error Rate**
   - Errors per minute/hour
   - Error rate by endpoint
   - Error rate by error code

2. **Error Distribution**
   - Most common error codes
   - Error severity distribution
   - Operational vs non-operational ratio

3. **Response Times**
   - Time to catch and process error
   - Time to send notification
   - End-to-end error handling time

4. **Notification Success Rate**
   - Successfully sent notifications
   - Failed notifications
   - Notification delivery time

### **Recommended Tools:**

- **Application Monitoring:** Sentry, Datadog, New Relic
- **Log Aggregation:** ELK Stack, Splunk, CloudWatch
- **Metrics:** Prometheus + Grafana
- **Alerting:** PagerDuty for critical errors

---

## 🎨 Frontend Error Handling Guide

### **Consuming Error Responses:**

```typescript
// Frontend API client
async function apiCall(endpoint: string, options: RequestInit) {
  try {
    const response = await fetch(endpoint, options);

    if (!response.ok) {
      const error = await response.json();

      // Error format is standardized
      console.error('API Error:', {
        code: error.code,
        message: error.message,
        context: error.context,
      });

      // Handle specific error codes
      switch (error.code) {
        case 'ERR_3000': // UNAUTHORIZED
          redirectToLogin();
          break;
        case 'ERR_4001': // RESOURCE_NOT_FOUND
          show404Page();
          break;
        case 'ERR_2000': // VALIDATION_ERROR
          showValidationErrors(error.context.errors);
          break;
        default:
          showGenericError(error.message);
      }

      throw error;
    }

    return response.json();
  } catch (error) {
    // Network errors, etc.
    throw error;
  }
}
```

### **Listening to Error Notifications:**

```typescript
// Frontend connects to notification WebSocket
const socket = io('http://localhost:3000/notify');

socket.on('notification', (notification) => {
  if (notification.type === 'ERROR') {
    // Show error toast/snackbar
    showErrorToast({
      message: notification.message,
      code: notification.context?.code,
      duration: 5000,
    });

    // Log for debugging
    console.error('Error notification:', notification);
  }
});
```

### **Error Code Documentation for Frontend:**

Create a shared constants file:

```typescript
// shared/error-codes.ts (shared between backend and frontend)
export const ERROR_CODES = {
  UNAUTHORIZED: 'ERR_3000',
  INVALID_TOKEN: 'ERR_3001',
  RESOURCE_NOT_FOUND: 'ERR_4001',
  VALIDATION_ERROR: 'ERR_2000',
  // ... etc
} as const;

export const ERROR_ACTIONS: Record<string, () => void> = {
  [ERROR_CODES.UNAUTHORIZED]: () => redirectToLogin(),
  [ERROR_CODES.INVALID_TOKEN]: () => refreshToken(),
  // ... etc
};
```

---

## 🧩 Advanced Features (Optional Enhancements)

### **1. Error Aggregation**

Group similar errors to reduce noise:

```typescript
interface ErrorAggregate {
  code: ErrorCode;
  count: number;
  firstOccurrence: Date;
  lastOccurrence: Date;
  affectedUsers: string[];
}

// Instead of sending 100 notifications for same error,
// send one: "Resource not found (occurred 100 times in last 5 min)"
```

### **2. Error Recovery Strategies**

Automatic retry logic for transient errors:

```typescript
export class RetryableError extends AppError {
  constructor(
    code: ErrorCode,
    message: string,
    public maxRetries: number = 3,
    public retryDelay: number = 1000
  ) {
    super(code, message);
  }
}

// In service
async operationWithRetry() {
  let attempts = 0;
  while (attempts < maxRetries) {
    try {
      return await this.riskyOperation();
    } catch (error) {
      if (error instanceof RetryableError && attempts < error.maxRetries) {
        await this.delay(error.retryDelay);
        attempts++;
        continue;
      }
      throw error;
    }
  }
}
```

### **3. Error Analytics Dashboard**

Track error trends over time:

- Error frequency charts
- Most common error codes
- Error rate by endpoint
- User impact (how many users affected)

### **4. Context-Aware Error Messages**

Customize error messages based on user context:

```typescript
private getContextualMessage(error: AppError, context: ContextMeta): string {
  // If user is admin, give more details
  if (context.role === 'admin') {
    return `${error.message} (Code: ${error.code}, Severity: ${error.severity})`;
  }

  // Regular users get friendlier message
  return this.getFriendlyMessage(error.code);
}
```

### **5. Error Correlation**

Link related errors across distributed systems:

```typescript
// Track error chains
interface ErrorChain {
  rootErrorId: string;
  childErrors: string[];
  correlationId: string;
}

// When service A calls service B and both fail,
// link them together for easier debugging
```

---

## 🔍 Debugging Guide

### **Common Issues:**

**1. Errors not being caught by filter**

- ✓ Check filter is registered globally
- ✓ Verify `APP_FILTER` provider is set
- ✓ Ensure error is thrown (not returned)

**2. Notifications not sent for errors**

- ✓ Check `notifyFrontend: true` in config
- ✓ Verify NotificationModule is imported
- ✓ Check error `isOperational: true`
- ✓ Verify notification strategy setting

**3. Stack traces exposed in production**

- ✓ Set `includeStackTrace: false` in config
- ✓ Verify environment is set correctly
- ✓ Check NODE_ENV variable

**4. Sensitive data in error logs**

- ✓ Implement sanitization in ErrorService
- ✓ Audit all error context objects
- ✓ Review log outputs

### **Testing Errors Locally:**

```typescript
// Create test endpoint to trigger errors
@Controller('test')
export class TestController {
  @Get('error/:type')
  throwTestError(@Param('type') type: string) {
    switch (type) {
      case 'validation':
        throw new ValidationError([
          { field: 'test', message: 'Test validation error' },
        ]);
      case 'business':
        throw new BusinessError('Test business rule violation');
      case 'critical':
        throw AppError.critical(
          ERROR_CODES.INTERNAL_SERVER_ERROR,
          'Test critical error',
        );
      default:
        throw new AppError(ERROR_CODES.UNKNOWN_ERROR, 'Test generic error');
    }
  }
}
```

---

## 🚀 Migration Guide

### **From Basic Error Handling:**

**Before:**

```typescript
@Get(':id')
async getProject(@Param('id') id: string) {
  const project = await this.projectRepo.findOne(id);
  if (!project) {
    throw new NotFoundException('Project not found');
  }
  return project;
}
```

**After:**

```typescript
@Get(':id')
async getProject(@Param('id') id: string) {
  const project = await this.projectRepo.findOne(id);
  if (!project) {
    throw new AppError(
      ERROR_CODES.RESOURCE_NOT_FOUND,
      'Project not found',
      { projectId: id }
    );
  }
  return project;
}
```

### **Migration Checklist:**

- [ ] Install ErrorModule in AppModule
- [ ] Replace all `throw new HttpException()` with `AppError`
- [ ] Replace all `throw new Error()` with `AppError`
- [ ] Add error codes to constants
- [ ] Update frontend to handle new error format
- [ ] Test error → notification flow
- [ ] Update API documentation
- [ ] Train team on new error handling

---

## 📖 API Reference

### **Error Classes:**

```typescript
// AppError
new AppError(code, message?, context?, severity?, isOperational?)
AppError.high(code, message?, context?)
AppError.critical(code, message?, context?)

// ValidationError
new ValidationError(errors, message?)
ValidationError.fromValidationErrors(classValidatorErrors)

// BusinessError
new BusinessError(message, context?)
BusinessError.invalidState(message, context?)
BusinessError.notAllowed(operation, reason?)
```

### **ErrorService Methods:**

```typescript
processError(error, request?): ErrorResponseDto
shouldNotify(error): boolean
logError(error, context?): void
reportError(error, context?): Promise<void>
createError(code, message?, context?): AppError
```

### **Configuration Options:**

```typescript
interface ErrorConfigDto {
  includeStackTrace: boolean; // Show stack traces
  notifyFrontend: boolean; // Send error notifications
  notificationStrategy: enum; // When to notify
  logErrors: boolean; // Log errors
  captureContext: boolean; // Include request context
  enableSentry?: boolean; // External error tracking
}
```

---

## ✨ Best Practices Summary

1. ✅ **Always use AppError for expected errors**
2. ✅ **Use specific error codes, not generic ones**
3. ✅ **Include context for debugging, but sanitize sensitive data**
4. ✅ **Mark programmer errors as non-operational (isOperational: false)**
5. ✅ **Use appropriate severity levels**
6. ✅ **Never expose stack traces in production**
7. ✅ **Test error handling paths**
8. ✅ **Document all error codes**
9. ✅ **Monitor error rates and patterns**
10. ✅ **Keep error messages user-friendly**

---

This specification provides everything needed to build a production-ready, secure, and maintainable error handling system that integrates seamlessly with the notification module.
