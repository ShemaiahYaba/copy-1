# Context Module

A production-ready request-scoped context management system for NestJS applications. Automatically captures and propagates request metadata (user ID, organization ID, correlation ID, etc.) throughout your entire application without manual parameter passing.

## 📋 Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Usage Examples](#usage-examples)
- [API Documentation](#api-documentation)
- [Storage Adapters](#storage-adapters)
- [Testing](#testing)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## ✨ Features

- **Request-scoped storage** - Automatic context isolation per request
- **Zero parameter passing** - Access context anywhere in your app
- **Multiple storage adapters** - CLS (recommended) or AsyncHooks
- **Flexible user extraction** - Headers, JWT, Session, or Custom
- **Auto-generated correlation IDs** - Built-in request tracing
- **Type-safe** - Full TypeScript support
- **Logging-friendly** - Formatted context for structured logging
- **Error handling** - Graceful failures never block requests
- **Comprehensive tests** - >80% coverage

---

## 📦 Installation

### Required Dependencies

```bash
# Using pnpm (recommended)
pnpm add nestjs-cls uuid@9 class-validator class-transformer

# Using npm
npm install nestjs-cls uuid@9 class-validator class-transformer

# Using yarn
yarn add nestjs-cls uuid@9 class-validator class-transformer
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
import { ContextModule } from './modules/shared/context';

@Module({
  imports: [
    // Basic setup with defaults
    ContextModule.register(),

    // OR with custom configuration
    ContextModule.register({
      adapter: ContextStorageAdapter.CLS,
      userIdSource: UserIdSource.JWT,
      includeRequestDetails: true,
      includeIp: true,
    }),
  ],
})
export class AppModule {}
```

### 2. Use in Services

```typescript
import { Injectable } from '@nestjs/common';
import { ContextService } from './modules/shared/context';

@Injectable()
export class ProjectService {
  constructor(private readonly contextService: ContextService) {}

  async createProject(data: CreateProjectDto) {
    // Get user from context (no need to pass it!)
    const userId = this.contextService.getUserId();
    const orgId = this.contextService.getOrgId();

    const project = await this.projectRepo.save({
      ...data,
      createdBy: userId,
      organizationId: orgId,
    });

    return project;
  }

  async logActivity(action: string) {
    // Get formatted logging context
    const logContext = this.contextService.getLoggingContext();

    this.logger.log({
      action,
      ...logContext, // userId, orgId, correlationId, etc.
    });
  }
}
```

### 3. Access in Controllers

```typescript
import { Controller, Post, Body } from '@nestjs/common';
import { ContextService } from './modules/shared/context';

@Controller('projects')
export class ProjectController {
  constructor(private readonly contextService: ContextService) {}

  @Post()
  async create(@Body() dto: CreateProjectDto) {
    // Context already populated by middleware
    const userId = this.contextService.getUserId();

    if (!userId) {
      throw new UnauthorizedException();
    }

    return this.projectService.create(dto);
  }

  @Get('context')
  getContext() {
    // Debug endpoint to see current context
    return this.contextService.getMeta();
  }
}
```

---

## ⚙️ Configuration

### Configuration Options

```typescript
export class ContextConfigDto {
  adapter: ContextStorageAdapter; // 'cls' | 'async_hooks'
  userIdSource: UserIdSource; // 'header' | 'jwt' | 'session' | 'custom'
  autoGenerate: boolean; // Auto-generate correlation ID
  includeRequestDetails: boolean; // path, method, etc.
  includeUserAgent: boolean; // Include user agent
  includeIp: boolean; // Include IP address
  customHeaders?: string[]; // Additional headers to capture
  headerNames: {
    userId: string;
    orgId: string;
    correlationId?: string;
  };
}
```

### Configuration Examples

#### Development Setup

```typescript
ContextModule.register({
  adapter: ContextStorageAdapter.CLS,
  userIdSource: UserIdSource.HEADER,
  autoGenerate: true,
  includeRequestDetails: true,
  includeUserAgent: true,
  includeIp: true,
});
```

#### Production Setup (JWT-based)

```typescript
ContextModule.register({
  adapter: ContextStorageAdapter.CLS,
  userIdSource: UserIdSource.JWT,
  autoGenerate: true,
  includeRequestDetails: true,
  includeUserAgent: false,
  includeIp: false, // Privacy-conscious
});
```

#### Custom Headers

```typescript
ContextModule.register({
  adapter: ContextStorageAdapter.CLS,
  userIdSource: UserIdSource.JWT,
  customHeaders: ['x-tenant-id', 'x-api-version', 'x-client-id'],
  includeRequestDetails: true,
});
```

#### Custom Header Names

```typescript
ContextModule.register({
  adapter: ContextStorageAdapter.CLS,
  userIdSource: UserIdSource.HEADER,
  headerNames: {
    userId: 'x-custom-user-id',
    orgId: 'x-custom-org-id',
    correlationId: 'x-request-id',
  },
});
```

---

## 📚 Usage Examples

### In Services

```typescript
@Injectable()
export class UserService {
  constructor(private contextService: ContextService) {}

  async getCurrentUser() {
    const userId = this.contextService.getUserId();
    return this.userRepo.findOne(userId);
  }

  async createAuditLog(action: string) {
    const context = this.contextService.getMeta();

    await this.auditRepo.save({
      action,
      userId: context.userId,
      orgId: context.orgId,
      correlationId: context.correlationId,
      ip: context.ip,
      timestamp: new Date(),
    });
  }
}
```

### In Notification Service

```typescript
@Injectable()
export class NotificationService {
  constructor(private contextService: ContextService) {}

  async push(dto: CreateNotificationDto) {
    const context = this.contextService.getMeta();

    const notification: INotification = {
      id: uuidv4(),
      ...dto,
      context: {
        ...dto.context,
        userId: context?.userId,
        correlationId: context?.correlationId,
      },
      timestamp: new Date(),
    };

    // Emit notification
    this.notificationGateway.emit(notification);
  }
}
```

### In Error Filter

```typescript
@Catch()
export class AppErrorFilter implements ExceptionFilter {
  constructor(private contextService: ContextService) {}

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    const contextMeta = this.contextService.getMeta();

    const errorResponse = {
      status: 'error',
      message: exception.message,
      correlationId: contextMeta?.correlationId,
      userId: contextMeta?.userId,
      timestamp: new Date(),
    };

    response.status(500).json(errorResponse);
  }
}
```

### In Logger

```typescript
@Injectable()
export class CustomLogger {
  constructor(private contextService: ContextService) {}

  log(message: string, additionalData?: any) {
    const context = this.contextService.getLoggingContext();

    console.log(
      JSON.stringify({
        level: 'info',
        message,
        ...context, // userId, correlationId, path, method
        ...additionalData,
        timestamp: new Date().toISOString(),
      }),
    );
  }

  error(message: string, trace?: string) {
    const context = this.contextService.getLoggingContext();

    console.error(
      JSON.stringify({
        level: 'error',
        message,
        trace,
        ...context,
        timestamp: new Date().toISOString(),
      }),
    );
  }
}
```

### In Interceptors

```typescript
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private contextService: ContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = this.contextService.getLoggingContext();

    console.log('Request started:', ctx);

    return next.handle().pipe(
      tap(() => console.log('Request completed:', ctx)),
      catchError((error) => {
        console.error('Request failed:', { ...ctx, error: error.message });
        throw error;
      }),
    );
  }
}
```

---

## 📖 API Documentation

### ContextService Methods

#### `setMeta(meta: ContextMeta): void`

Set complete context metadata.

```typescript
contextService.setMeta({
  userId: '123',
  orgId: 'org-456',
  correlationId: 'corr-789',
  timestamp: new Date(),
});
```

---

#### `getMeta(): ContextMeta | undefined`

Get complete context metadata.

```typescript
const context = contextService.getMeta();
// Returns: { userId: '123', orgId: 'org-456', ... }
```

---

#### `updateMeta(partial: Partial<ContextMeta>): void`

Update specific fields in context.

```typescript
contextService.updateMeta({ userId: '999' });
```

---

#### `get<T>(key: keyof ContextMeta): T | undefined`

Get specific field from context.

```typescript
const userId = contextService.get<string>('userId');
const path = contextService.get<string>('path');
```

---

#### `set(key: keyof ContextMeta, value: any): void`

Set specific field in context.

```typescript
contextService.set('userId', '456');
contextService.set('customField', 'value');
```

---

#### `getUserId(): string | undefined`

Get user ID from context.

```typescript
const userId = contextService.getUserId();
```

---

#### `getOrgId(): string | undefined`

Get organization ID from context.

```typescript
const orgId = contextService.getOrgId();
```

---

#### `getCorrelationId(): string`

Get correlation ID from context (always exists).

```typescript
const correlationId = contextService.getCorrelationId();
```

---

#### `hasContext(): boolean`

Check if context exists.

```typescript
if (contextService.hasContext()) {
  // Context is available
}
```

---

#### `clear(): void`

Clear current context.

```typescript
contextService.clear();
```

---

#### `getLoggingContext(): Record<string, any>`

Get formatted context for logging.

```typescript
const logContext = contextService.getLoggingContext();
// Returns: { userId, orgId, correlationId, path, method, timestamp }
```

---

### ContextMeta Interface

```typescript
interface ContextMeta {
  // User identification
  userId?: string;
  username?: string;
  email?: string;

  // Organization/Tenant
  orgId?: string;
  orgName?: string;

  // Request tracking
  correlationId: string; // Required
  requestId?: string;

  // Request details
  path?: string;
  method?: string;
  ip?: string;
  userAgent?: string;

  // Timestamps
  timestamp: Date;

  // Additional metadata
  [key: string]: any;
}
```

---

## 🔧 Storage Adapters

### CLS Adapter (Recommended)

Uses `nestjs-cls` for request-scoped storage.

**Benefits:**

- Battle-tested and reliable
- TypeScript-friendly
- Well-maintained
- Good performance
- Automatic cleanup

**Setup:**

```typescript
ContextModule.register({
  adapter: ContextStorageAdapter.CLS,
});
```

### AsyncHooks Adapter

Uses Node.js `async_hooks` for storage.

**Benefits:**

- No external dependencies
- Native Node.js support
- Good for simple use cases

**Setup:**

```typescript
ContextModule.register({
  adapter: ContextStorageAdapter.ASYNC_HOOKS,
});
```

---

## 🧪 Testing

### Run Tests

```bash
# Unit tests
pnpm test context.service.spec.ts
pnpm test context.middleware.spec.ts

# Integration tests
pnpm test context.integration.spec.ts

# All context tests
pnpm test context

# With coverage
pnpm test -- --coverage context
```

### Writing Tests

```typescript
import { Test } from '@nestjs/testing';
import { ContextModule, ContextService } from './context';

describe('My Feature', () => {
  let contextService: ContextService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [ContextModule.register()],
    }).compile();

    contextService = module.get(ContextService);
  });

  it('should access user ID from context', () => {
    contextService.setMeta({
      userId: 'test-user',
      correlationId: 'test-corr',
      timestamp: new Date(),
    });

    const userId = contextService.getUserId();
    expect(userId).toBe('test-user');
  });
});
```

---

## 🎯 Best Practices

### 1. Always Check for Context

```typescript
// ✅ Good
const userId = this.contextService.getUserId();
if (!userId) {
  throw new UnauthorizedException('User not authenticated');
}

// ❌ Bad
const userId = this.contextService.getUserId()!; // Assumes always exists
```

### 2. Use Logging Context

```typescript
// ✅ Good
const context = this.contextService.getLoggingContext();
this.logger.log('Operation completed', context);

// ❌ Bad
const meta = this.contextService.getMeta();
this.logger.log('Operation completed', meta); // Too verbose
```

### 3. Run Middleware After Auth

```typescript
// In AppModule
configure(consumer: MiddlewareConsumer) {
  consumer
    .apply(AuthMiddleware)      // 1. Authenticate (populate req.user)
    .forRoutes('*')
    .apply(ContextMiddleware)   // 2. Extract context (read req.user)
    .forRoutes('*');
}
```

### 4. Don't Store Sensitive Data

```typescript
// ❌ Bad
contextService.setMeta({
  userId: '123',
  password: 'secret', // Never store passwords!
  creditCard: '1234', // Never store sensitive data!
  correlationId: 'corr-456',
  timestamp: new Date(),
});

// ✅ Good
contextService.setMeta({
  userId: '123',
  orgId: 'org-456',
  correlationId: 'corr-789',
  timestamp: new Date(),
});
```

### 5. Use Correlation IDs for Tracing

```typescript
// In service
async callExternalAPI(data: any) {
  const correlationId = this.contextService.getCorrelationId();

  // Pass to downstream service
  await this.httpService.post('https://api.example.com/data', data, {
    headers: {
      'x-correlation-id': correlationId,
    },
  });
}
```

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Context is Undefined

**Problem:** `contextService.getMeta()` returns `undefined`

**Solutions:**

```typescript
// 1. Ensure middleware is registered
@Module({
  imports: [ContextModule.register()],
})

// 2. Check middleware order (after auth)
configure(consumer: MiddlewareConsumer) {
  consumer
    .apply(AuthMiddleware)
    .forRoutes('*')
    .apply(ContextMiddleware) // Must be after auth
    .forRoutes('*');
}

// 3. Verify adapter installation
pnpm add nestjs-cls
```

---

#### 2. User ID Not Extracted

**Problem:** `getUserId()` returns `undefined`

**Solutions:**

```typescript
// Check userIdSource configuration
ContextModule.register({
  userIdSource: UserIdSource.JWT, // Must match your auth setup
});

// Verify req.user is populated
@Injectable()
export class AuthMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    req.user = { id: '123' }; // Ensure this happens before ContextMiddleware
    next();
  }
}
```

---

#### 3. Context Leaking Between Requests

**Problem:** Context from one request appears in another

**Solution:**

```typescript
// Use CLS adapter (recommended)
ContextModule.register({
  adapter: ContextStorageAdapter.CLS, // Better isolation
});

// Ensure nestjs-cls is installed
pnpm add nestjs-cls
```

---

#### 4. TypeScript Errors

**Problem:** Cannot find module errors

**Solution:**

```typescript
// Use correct import paths
import { ContextModule, ContextService } from './modules/shared/context';

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

## 📊 Context Data Format

All context metadata follows this standardized format:

```typescript
{
  // User identification
  userId: 'user-123',
  username: 'johndoe',
  email: 'john@example.com',

  // Organization
  orgId: 'org-456',
  orgName: 'Acme Corp',

  // Request tracking
  correlationId: 'abc-def-123',  // Always present
  requestId: 'req-789',

  // Request details
  path: '/api/projects',
  method: 'POST',
  ip: '192.168.1.1',
  userAgent: 'Mozilla/5.0...',

  // Timestamps
  timestamp: Date('2025-11-18T12:00:00Z'),

  // Custom fields
  tenantId: 'tenant-999',
  apiVersion: 'v2'
}
```

---

## 🔒 Security Considerations

### 1. IP Address Privacy

```typescript
// Consider privacy regulations (GDPR)
ContextModule.register({
  includeIp: false, // Don't capture IPs in EU
});
```

### 2. Never Store Sensitive Data

**❌ Never include:**

- Passwords
- API keys
- Credit card numbers
- Social security numbers
- Authentication tokens

**✅ Safe to include:**

- User IDs
- Organization IDs
- Correlation IDs
- Request paths
- Timestamps

### 3. Log Sanitization

```typescript
// Use getLoggingContext() for safe logging
const context = this.contextService.getLoggingContext();
this.logger.log('Event occurred', context); // Only logs safe fields
```

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
- [nestjs-cls](https://github.com/Papooch/nestjs-cls)
- [UUID v9](https://www.npmjs.com/package/uuid)

---

**Last Updated:** November 2025  
**Module Version:** 1.0.0  
**Test Coverage:** >80%
