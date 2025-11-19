# Context Module - Build Specification

## 🎯 Module Purpose

Provide request-scoped storage for metadata (user ID, organization ID, correlation ID, etc.) that automatically flows through the entire request lifecycle. Eliminates the need to manually pass context data through every service method, while enabling better logging, tracing, and debugging.

---

## 📦 Module Overview

**Name:** `ContextModule`  
**Type:** Core Module (Request-Scoped Service)  
**Dependencies:** `@nestjs/common`, `nestjs-cls` or `async_hooks`, `uuid`

---

## 🏗️ File Structure

```
src/context/
├── dto/
│   ├── context-config.dto.ts           # Module configuration
│   └── index.ts                        # Barrel export
├── interfaces/
│   ├── context-meta.interface.ts       # Context metadata shape
│   ├── context-storage.interface.ts    # Storage adapter interface
│   └── index.ts
├── middleware/
│   ├── context.middleware.ts           # Request context initializer
│   └── index.ts
├── interceptors/
│   ├── context.interceptor.ts          # Alternative to middleware (optional)
│   └── index.ts
├── adapters/
│   ├── cls-storage.adapter.ts          # nestjs-cls implementation
│   ├── async-hooks.adapter.ts          # async_hooks implementation
│   └── index.ts
├── context.service.ts                  # Core context service
├── context.module.ts                   # Module definition
├── __tests__/
│   ├── context.service.spec.ts         # Unit tests for service
│   ├── context.middleware.spec.ts      # Unit tests for middleware
│   └── context.integration.spec.ts     # Integration tests
└── README.md                           # Module documentation
```

---

## 📋 Core Components Specification

### 1. **Context Meta Interface**

**File:** `interfaces/context-meta.interface.ts`

```typescript
export interface ContextMeta {
  // User identification
  userId?: string;
  username?: string;
  email?: string;

  // Organization/Tenant
  orgId?: string;
  orgName?: string;

  // Request tracking
  correlationId: string; // Required - always generated
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

export interface ContextOptions {
  includeRequestDetails?: boolean;
  includeUserAgent?: boolean;
  includeIp?: boolean;
  customFields?: string[]; // Extract custom headers
}
```

**Purpose:** Define what data Context tracks  
**Flexibility:** Extensible via index signature for custom fields

---

### 2. **Context Storage Interface**

**File:** `interfaces/context-storage.interface.ts`

```typescript
export interface IContextStorage {
  /**
   * Set context metadata for current request
   */
  set(meta: ContextMeta): void;

  /**
   * Get context metadata for current request
   */
  get(): ContextMeta | undefined;

  /**
   * Check if context exists for current request
   */
  has(): boolean;

  /**
   * Clear context for current request
   */
  clear(): void;

  /**
   * Update specific fields in context
   */
  update(partial: Partial<ContextMeta>): void;
}
```

**Purpose:** Abstract storage mechanism  
**Benefit:** Can swap implementations (CLS vs async_hooks) without changing code

---

### 3. **Context Config DTO**

**File:** `dto/context-config.dto.ts`

```typescript
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsArray,
  IsString,
} from 'class-validator';

export enum ContextStorageAdapter {
  CLS = 'cls', // nestjs-cls (recommended)
  ASYNC_HOOKS = 'async_hooks', // Node.js async_hooks
}

export enum UserIdSource {
  HEADER = 'header', // From request header
  JWT = 'jwt', // Extract from JWT token
  SESSION = 'session', // From session
  CUSTOM = 'custom', // Custom extraction logic
}

export class ContextConfigDto {
  @IsEnum(ContextStorageAdapter)
  adapter: ContextStorageAdapter = ContextStorageAdapter.CLS;

  @IsEnum(UserIdSource)
  userIdSource: UserIdSource = UserIdSource.JWT;

  @IsBoolean()
  autoGenerate: boolean = true; // Auto-generate correlation ID

  @IsBoolean()
  includeRequestDetails: boolean = true; // path, method, etc.

  @IsBoolean()
  includeUserAgent: boolean = false;

  @IsBoolean()
  includeIp: boolean = true;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  customHeaders?: string[]; // Additional headers to capture

  // Header names for extracting data
  headerNames: {
    userId: string;
    orgId: string;
    correlationId?: string; // If client sends one, use it
  } = {
    userId: 'x-user-id',
    orgId: 'x-org-id',
    correlationId: 'x-correlation-id',
  };
}
```

**Purpose:** Configure context behavior  
**Flexibility:** Supports multiple storage adapters and user ID sources

---

### 4. **Context Service**

**File:** `context.service.ts`

#### **Responsibilities:**

1. Store and retrieve context metadata
2. Provide helper methods for common operations
3. Abstract storage implementation details
4. Handle missing context gracefully

#### **Public Methods:**

```typescript
@Injectable()
export class ContextService {
  /**
   * Set complete context metadata
   * @param meta - Context metadata
   */
  setMeta(meta: ContextMeta): void;

  /**
   * Get complete context metadata
   * @returns Current context or undefined
   */
  getMeta(): ContextMeta | undefined;

  /**
   * Update specific fields in context
   * @param partial - Fields to update
   */
  updateMeta(partial: Partial<ContextMeta>): void;

  /**
   * Get specific field from context
   * @param key - Field name
   * @returns Field value or undefined
   */
  get<T = any>(key: keyof ContextMeta): T | undefined;

  /**
   * Set specific field in context
   * @param key - Field name
   * @param value - Field value
   */
  set(key: keyof ContextMeta, value: any): void;

  /**
   * Get user ID from context
   * @returns User ID or undefined
   */
  getUserId(): string | undefined;

  /**
   * Get organization ID from context
   * @returns Org ID or undefined
   */
  getOrgId(): string | undefined;

  /**
   * Get correlation ID from context (always exists)
   * @returns Correlation ID
   */
  getCorrelationId(): string;

  /**
   * Check if context exists
   * @returns true if context is set
   */
  hasContext(): boolean;

  /**
   * Clear current context
   */
  clear(): void;

  /**
   * Get formatted context for logging
   * @returns Logging-friendly context object
   */
  getLoggingContext(): Record<string, any>;
}
```

#### **Implementation Requirements:**

1. **Graceful Handling:**
   - Return `undefined` instead of throwing when context missing
   - Provide safe defaults
   - Log warnings for missing context in development

2. **Type Safety:**
   - Strong typing for context fields
   - Generic get() method for custom fields
   - Proper return types

3. **Performance:**
   - Minimal overhead (<1ms per operation)
   - Lazy initialization
   - No unnecessary object cloning

4. **Thread Safety:**
   - Request-scoped isolation
   - No cross-request contamination
   - Proper cleanup after request

---

### 5. **Context Middleware**

**File:** `middleware/context.middleware.ts`

#### **Responsibilities:**

1. Initialize context at start of request
2. Extract user/org data from request
3. Generate correlation ID
4. Populate context metadata
5. Clean up after request completes

#### **Implementation:**

```typescript
@Injectable()
export class ContextMiddleware implements NestMiddleware {
  constructor(
    private readonly contextService: ContextService,
    @Inject('CONTEXT_CONFIG') private readonly config: ContextConfigDto,
  ) {}

  use(req: Request, res: Response, next: NextFunction) {
    try {
      const meta: ContextMeta = {
        correlationId: this.extractCorrelationId(req),
        timestamp: new Date(),
      };

      // Extract user information
      if (this.config.userIdSource === UserIdSource.HEADER) {
        meta.userId = req.headers[this.config.headerNames.userId] as string;
        meta.orgId = req.headers[this.config.headerNames.orgId] as string;
      } else if (this.config.userIdSource === UserIdSource.JWT) {
        // Extract from JWT (req.user should be set by auth guard)
        const user = (req as any).user;
        if (user) {
          meta.userId = user.id || user.userId;
          meta.orgId = user.orgId;
          meta.username = user.username;
          meta.email = user.email;
        }
      }

      // Add request details
      if (this.config.includeRequestDetails) {
        meta.path = req.path;
        meta.method = req.method;
      }

      if (this.config.includeIp) {
        meta.ip = this.extractIp(req);
      }

      if (this.config.includeUserAgent) {
        meta.userAgent = req.headers['user-agent'];
      }

      // Custom headers
      if (this.config.customHeaders) {
        this.config.customHeaders.forEach((header) => {
          meta[header] = req.headers[header];
        });
      }

      // Set context
      this.contextService.setMeta(meta);

      next();
    } catch (error) {
      // Don't block request if context initialization fails
      console.error('Context initialization failed:', error);
      next();
    }
  }

  private extractCorrelationId(req: Request): string {
    // Use client-provided correlation ID if exists
    const clientCorrelationId = req.headers[
      this.config.headerNames.correlationId || 'x-correlation-id'
    ] as string;

    return clientCorrelationId || uuidv4();
  }

  private extractIp(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      (req.headers['x-real-ip'] as string) ||
      req.socket.remoteAddress ||
      'unknown'
    );
  }
}
```

**Purpose:** Bootstrap context for every request  
**Execution Order:** Should run early in middleware chain (after auth)

---

### 6. **CLS Storage Adapter**

**File:** `adapters/cls-storage.adapter.ts`

```typescript
import { ClsService } from 'nestjs-cls';
import { IContextStorage } from '../interfaces/context-storage.interface';
import { ContextMeta } from '../interfaces/context-meta.interface';

export class ClsStorageAdapter implements IContextStorage {
  constructor(private readonly cls: ClsService) {}

  set(meta: ContextMeta): void {
    this.cls.set('context', meta);
  }

  get(): ContextMeta | undefined {
    return this.cls.get('context');
  }

  has(): boolean {
    return this.cls.get('context') !== undefined;
  }

  clear(): void {
    this.cls.set('context', undefined);
  }

  update(partial: Partial<ContextMeta>): void {
    const current = this.get();
    if (current) {
      this.set({ ...current, ...partial });
    }
  }
}
```

**Purpose:** Implement storage using nestjs-cls (recommended)  
**Benefits:**

- Battle-tested
- TypeScript-friendly
- Well-maintained
- Good performance

---

### 7. **Async Hooks Storage Adapter**

**File:** `adapters/async-hooks.adapter.ts`

```typescript
import { AsyncLocalStorage } from 'async_hooks';
import { IContextStorage } from '../interfaces/context-storage.interface';
import { ContextMeta } from '../interfaces/context-meta.interface';

export class AsyncHooksStorageAdapter implements IContextStorage {
  private storage = new AsyncLocalStorage<ContextMeta>();

  set(meta: ContextMeta): void {
    this.storage.enterWith(meta);
  }

  get(): ContextMeta | undefined {
    return this.storage.getStore();
  }

  has(): boolean {
    return this.storage.getStore() !== undefined;
  }

  clear(): void {
    // AsyncLocalStorage doesn't have explicit clear
    // Context will be cleared when async context exits
  }

  update(partial: Partial<ContextMeta>): void {
    const current = this.get();
    if (current) {
      this.set({ ...current, ...partial });
    }
  }

  /**
   * Run callback with context
   */
  run<T>(meta: ContextMeta, callback: () => T): T {
    return this.storage.run(meta, callback);
  }
}
```

**Purpose:** Alternative storage using Node.js async_hooks  
**Use case:** If you can't use nestjs-cls

---

### 8. **Context Module**

**File:** `context.module.ts`

#### **Configuration:**

```typescript
@Global() // Make available everywhere
@Module({})
export class ContextModule {
  static register(config?: ContextConfigDto): DynamicModule {
    const finalConfig = config || new ContextConfigDto();

    // Choose storage adapter
    const StorageProvider = {
      provide: 'CONTEXT_STORAGE',
      useFactory: (cls?: ClsService) => {
        if (finalConfig.adapter === ContextStorageAdapter.CLS) {
          if (!cls) {
            throw new Error('ClsService not available. Install nestjs-cls.');
          }
          return new ClsStorageAdapter(cls);
        } else {
          return new AsyncHooksStorageAdapter();
        }
      },
      inject: [ClsService],
    };

    return {
      module: ContextModule,
      imports: [
        // Conditionally import ClsModule if using CLS adapter
        ...(finalConfig.adapter === ContextStorageAdapter.CLS
          ? [ClsModule.forRoot({ middleware: { mount: false } })]
          : []),
      ],
      providers: [
        ContextService,
        {
          provide: 'CONTEXT_CONFIG',
          useValue: finalConfig,
        },
        StorageProvider,
      ],
      exports: [ContextService],
    };
  }

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ContextMiddleware).forRoutes('*');
  }
}
```

**Purpose:** Wire up context system with proper adapter  
**Features:**

- Global by default (available everywhere)
- Dynamic adapter selection
- Automatic middleware registration

---

## 🧪 Test Specifications

### **Unit Tests: ContextService**

**File:** `__tests__/context.service.spec.ts`

#### **Test Cases:**

1. **Metadata Management**
   - ✓ Should set and get complete metadata
   - ✓ Should update specific fields
   - ✓ Should get specific field by key
   - ✓ Should set specific field by key
   - ✓ Should return undefined for missing context
   - ✓ Should clear context

2. **Helper Methods**
   - ✓ getUserId() should return userId from context
   - ✓ getOrgId() should return orgId from context
   - ✓ getCorrelationId() should always return value
   - ✓ hasContext() should return true when context exists
   - ✓ hasContext() should return false when context missing

3. **Logging Context**
   - ✓ getLoggingContext() should return formatted object
   - ✓ Should include relevant fields
   - ✓ Should handle missing context gracefully

4. **Error Handling**
   - ✓ Should not throw on missing context
   - ✓ Should return undefined for missing fields
   - ✓ Should handle undefined values gracefully

---

### **Unit Tests: ContextMiddleware**

**File:** `__tests__/context.middleware.spec.ts`

#### **Test Cases:**

1. **Context Initialization**
   - ✓ Should initialize context on request
   - ✓ Should generate correlation ID
   - ✓ Should set timestamp

2. **User Extraction (Header Mode)**
   - ✓ Should extract userId from header
   - ✓ Should extract orgId from header
   - ✓ Should use configured header names

3. **User Extraction (JWT Mode)**
   - ✓ Should extract userId from req.user
   - ✓ Should extract orgId from req.user
   - ✓ Should extract username and email

4. **Correlation ID**
   - ✓ Should use client-provided correlation ID if exists
   - ✓ Should generate new ID if not provided
   - ✓ Should use configured header name

5. **Request Details**
   - ✓ Should include path and method when enabled
   - ✓ Should exclude when disabled
   - ✓ Should extract IP address correctly
   - ✓ Should extract user agent when enabled

6. **Custom Headers**
   - ✓ Should capture custom headers when configured
   - ✓ Should skip if not configured

7. **Error Handling**
   - ✓ Should not block request if initialization fails
   - ✓ Should log error and continue
   - ✓ Should call next() even on error

---

### **Integration Tests**

**File:** `__tests__/context.integration.spec.ts`

#### **Test Cases:**

1. **End-to-End Context Flow**
   - ✓ Request → Middleware initializes → Service reads → Response
   - ✓ Context available in controller
   - ✓ Context available in nested services
   - ✓ Context cleared after request completes

2. **Request Isolation**
   - ✓ Concurrent requests have separate contexts
   - ✓ No cross-request contamination
   - ✓ Context cleaned up properly

3. **Integration with Auth**
   - ✓ Context set after authentication
   - ✓ User data populated from JWT
   - ✓ Works with AuthGuard

4. **Integration with Other Modules**
   - ✓ NotificationService can read context
   - ✓ ErrorFilter can read context
   - ✓ Logger can read context

5. **Adapter Switching**
   - ✓ CLS adapter works correctly
   - ✓ AsyncHooks adapter works correctly
   - ✓ Both adapters isolated properly

---

## 📊 Test Data

### **Valid Context Samples:**

```typescript
// Authenticated user context
{
  userId: '123',
  username: 'john_doe',
  email: 'john@example.com',
  orgId: 'org_456',
  orgName: 'Acme Corp',
  correlationId: 'abc-def-123',
  requestId: 'req_789',
  path: '/api/projects',
  method: 'POST',
  ip: '192.168.1.1',
  timestamp: new Date('2025-11-18T12:00:00Z')
}

// Unauthenticated request context
{
  correlationId: 'xyz-789-456',
  path: '/api/health',
  method: 'GET',
  ip: '192.168.1.2',
  timestamp: new Date('2025-11-18T12:01:00Z')
}

// Minimal context
{
  correlationId: 'min-123-456',
  timestamp: new Date('2025-11-18T12:02:00Z')
}
```

---

## 🔧 Configuration Examples

### **Basic Setup (JWT-based):**

```typescript
ContextModule.register({
  adapter: ContextStorageAdapter.CLS,
  userIdSource: UserIdSource.JWT,
  autoGenerate: true,
  includeRequestDetails: true,
  includeIp: true,
});
```

### **Header-based (for testing/development):**

```typescript
ContextModule.register({
  adapter: ContextStorageAdapter.CLS,
  userIdSource: UserIdSource.HEADER,
  headerNames: {
    userId: 'x-user-id',
    orgId: 'x-org-id',
  },
  includeRequestDetails: true,
});
```

### **Minimal (production):**

```typescript
ContextModule.register({
  adapter: ContextStorageAdapter.CLS,
  userIdSource: UserIdSource.JWT,
  includeRequestDetails: false,
  includeUserAgent: false,
  includeIp: false, // Privacy-conscious
});
```

### **Extended (with custom headers):**

```typescript
ContextModule.register({
  adapter: ContextStorageAdapter.CLS,
  userIdSource: UserIdSource.JWT,
  customHeaders: ['x-tenant-id', 'x-api-version', 'x-client-id'],
  includeRequestDetails: true,
});
```

---

## 📝 Usage Examples

### **In a Service:**

```typescript
@Injectable()
export class ProjectService {
  constructor(private contextService: ContextService) {}

  async createProject(data: CreateProjectDto) {
    // Get user from context (no need to pass it)
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
    // Get logging context
    const logContext = this.contextService.getLoggingContext();

    this.logger.log({
      action,
      ...logContext, // Includes userId, orgId, correlationId, etc.
    });
  }
}
```

### **In a Controller:**

```typescript
@Controller('projects')
export class ProjectController {
  constructor(private contextService: ContextService) {}

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

### **In Notification Service:**

```typescript
@Injectable()
export class NotificationService {
  constructor(private contextService: ContextService) {}

  async push(dto: CreateNotificationDto) {
    // Automatically include context in notification
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

    // ... emit notification
  }
}
```

### **In Error Filter:**

```typescript
@Catch()
export class AppErrorFilter implements ExceptionFilter {
  constructor(private contextService: ContextService) {}

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    // Include context in error response
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

### **In Logger:**

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
}
```

---

## ✅ Acceptance Criteria

Module is complete when:

1. ✅ All files created per structure
2. ✅ Both storage adapters implemented
3. ✅ Middleware initializes context correctly
4. ✅ Service provides all helper methods
5. ✅ Context isolated per request
6. ✅ No cross-request contamination
7. ✅ All unit tests pass (>80% coverage)
8. ✅ Integration tests pass
9. ✅ Works with NotificationModule and ErrorModule
10. ✅ README documents usage and configuration

---

## 📦 Required Dependencies

```json
{
  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "uuid": "^9.0.0",
    "nestjs-cls": "^4.0.0"
  },
  "devDependencies": {
    "@types/uuid": "^9.0.0"
  }
}
```

**Note:** `nestjs-cls` only needed if using CLS adapter

---

## 🚀 Implementation Phases

### **Phase 1: Foundation (Day 1)**

- [ ] Create file structure
- [ ] Define interfaces (ContextMeta, IContextStorage)
- [ ] Create configuration DTO
- [ ] Write README

### **Phase 2: Storage Adapters (Day 2)**

- [ ] Implement CLS storage adapter
- [ ] Implement AsyncHooks storage adapter
- [ ] Write adapter unit tests
- [ ] Test adapter isolation

### **Phase 3: Core Service (Day 3)**

- [ ] Implement ContextService
- [ ] Add all helper methods
- [ ] Wire up storage adapter
- [ ] Write service unit tests

### **Phase 4: Middleware (Day 4)**

- [ ] Implement ContextMiddleware
- [ ] Add user extraction logic
- [ ] Add request details capture
- [ ] Write middleware unit tests

### **Phase 5: Integration (Day 5)**

- [ ] Create dynamic module
- [ ] Wire up adapters dynamically
- [ ] Write integration tests
- [ ] Test with NotificationModule
- [ ] Test with ErrorModule
- [ ] Documentation review

---

## 🎯 Success Metrics

- **Test Coverage:** >80%
- **Context Overhead:** <0.5ms per request
- **Memory Usage:** <1KB per context
- **Isolation:** 100% (zero cross-request contamination)
- **Reliability:** Context available in 100% of requests

---

## 📚 Documentation Requirements

**README.md must include:**

1. **Quick Start Guide**
   - Installation
   - Basic configuration
   - First usage example

2. **Configuration Options**
   - All config parameters
   - Storage adapter comparison
   - UserIdSource options

3. **Usage Patterns**
   - Common use cases
   - Integration examples
   - Best practices

4. **API Reference**
   - All service methods
   - Method signatures
   - Return types

5. **Troubleshooting**
   - Common issues
   - Debugging tips
   - FAQ

6. **Performance Considerations**
   - Overhead benchmarks
   - Optimization tips

---

## 🔒 Security & Privacy Considerations

### **1. Sensitive Data**

**Be careful what you store in context:**

- ❌ Never store passwords
- ❌ Never store full credit card numbers
- ❌ Never store API keys/secrets
- ✅ Store user/org IDs only
- ✅ Store correlation IDs for tracing
- ✅ Store non-sensitive metadata

### **2. IP Address Privacy**

**Consider privacy regulations:**

- GDPR may require IP anonymization
- Consider making `includeIp` false by default
- Provide configuration to mask last octet

**Implementation:**

```typescript
private maskIp(ip: string): string {
  if (!this.config.includeFullIp) {
    // Mask last octet: 192.168.1.100 → 192.168.1.0
    return ip.replace(/\.\d+$/, '.0');
  }
  return ip;
}
```

### **3. Context Logging**

**When logging context:**

- Don't log entire context in production
- Use `getLoggingContext()` for safe subset
- Implement log level controls
- Consider data retention policies

---

## 🔄 Integration Examples

### **With AuthGuard:**

```typescript
// Auth runs first, sets req.user
@UseGuards(AuthGuard)
@Controller('api')
export class ApiController {
  // Context middleware runs after auth
  // Context reads req.user automatically
  @Get('profile')
  getProfile() {
    const userId = this.contextService.getUserId();
    // userId already populated from req.user
  }
}
```

### **With GraphQL:**

```typescript
@Resolver()
export class UserResolver {
  constructor(private contextService: ContextService) {}

  @Query(() => User)
  me(@Context() gqlContext) {
    // Context available in GraphQL too
    const userId = this.contextService.getUserId();
    return this.userService.findById(userId);
  }
}
```

### **With Microservices:**

```typescript
// Propagate correlation ID to downstream services
@Injectable()
export class OrderService {
  async createOrder(data: CreateOrderDto) {
    const correlationId = this.contextService.getCorrelationId();

    // Pass to downstream service
    await this.httpService.post('http://payment-service/charge', data, {
      headers: {
        'x-correlation-id': correlationId,
      },
    });
  }
}
```

---

## 🧩 Advanced Features (Optional)

### **1. Context Propagation to Child Processes**

```typescript
// Propagate context to worker threads or child processes
export class WorkerService {
  async runTask(taskData: any) {
    const context = this.contextService.getMeta();

    const worker = new Worker('./task-worker.js', {
      workerData: {
        task: taskData,
        context, // Pass context to worker
      },
    });
  }
}
```

### **2. Context Middleware Priority**

Ensure context runs at the right time:

```typescript
// In AppModule
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware) // 1. Logger (optional)
      .forRoutes('*')
      .apply(AuthMiddleware) // 2. Auth (populate req.user)
      .forRoutes('*')
      .apply(ContextMiddleware) // 3. Context (read req.user)
      .forRoutes('*');
  }
}
```

### **3. Context Decorator**

Create custom decorator for easy access:

```typescript
// decorators/context.decorator.ts
export const Ctx = createParamDecorator(
  (data: keyof ContextMeta | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const contextService = request.app.get(ContextService);
    const meta = contextService.getMeta();

    return data ? meta?.[data] : meta;
  },
);

// Usage in controller
```
