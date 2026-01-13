# Gradlinq Project - Execution Spec Extension

> **Extends**: NestJS Execution Specification (Baseline v1)  
> **Last Updated**: January 2026  
> **Codebase**: Gradlinq (NestJS + Drizzle + Supabase Auth)

---

## 1. Authentication & Authorization

### Pattern: Supabase OTP-Based Auth

**Core Flow:**

- ✅ Registration creates Supabase user → sends OTP → user verifies → account activated
- ✅ Login sends OTP → user verifies → session created
- ✅ NO Passport.js - direct Supabase integration via `SupabaseService`

**Key Files:**

- `src/modules/core/auth/services/supabase.service.ts` - Supabase integration
- `src/modules/core/auth/services/user.service.ts` - Database user management
- `src/modules/core/auth/auth.service.ts` - Business logic orchestration

**Authentication Components:**

```typescript
// Guards (NO Passport required)
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProjectController {
  @Get()
  @Roles('client', 'supervisor')
  async getProjects(@CurrentUser() user: User) {
    // user is type-safe and guaranteed to exist
  }
}

// Decorators
@CurrentUser() - Extract user from request
@Roles(...roles) - Restrict by role
@Public() - Bypass authentication
```

**User Roles:** `client`, `supervisor`, `student`, `university`

**Critical Pattern:**

```typescript
// ✅ CORRECT: Separate registration and OTP verification
async registerClient(dto) {
  const supabaseUser = await supabase.createUser(email, password);
  await supabase.sendOTP(email, 'signup');
  const dbUser = await userService.createClient(data);
  return { email, otpSent: true, userId: dbUser.id }; // Pending state
}

async verifyRegistrationOTP(dto) {
  const { session, user } = await supabase.verifyOTP(email, token);
  await userService.updateUser(user.id, { emailVerified: true });
  return { user, session, profile }; // Full auth response
}

// ❌ WRONG: Returning full session before OTP verification
async registerClient(dto) {
  const user = await supabase.createUser(email, password);
  return { session: { accessToken, refreshToken } }; // Should be pending!
}
```

---

## 2. Database Layer

### ORM: Drizzle with PostgreSQL (Supabase)

**Key Principles:**

- ✅ All tables use UUIDs as primary keys
- ✅ Always include `createdAt` and `updatedAt` timestamps
- ✅ Use cascade deletes for dependent data
- ✅ Central schema export in `src/database/schema/index.ts`
- ✅ Models live in module directories: `src/modules/*/models/*.model.ts`

**Database Patterns:**

```typescript
// ✅ CORRECT: Model definition
export const users = pgTable('users', {
  id: uuid('id').primaryKey(),  // ✅ UUID from Supabase
  email: varchar('email', { length: 255 }).notNull().unique(),
  role: userRoleEnum('role').notNull(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  emailIdx: index('users_email_idx').on(table.email),  // ✅ Index foreign keys
}));

// ✅ CORRECT: Service usage
async createProject(dto: CreateProjectDto) {
  const [project] = await this.db.db
    .insert(projects)
    .values(dto)
    .returning();

  return project;
}

// ✅ CORRECT: Transaction usage
async transferOwnership(projectId: string, newUserId: string) {
  return this.db.db.transaction(async (tx) => {
    const [project] = await tx
      .update(projects)
      .set({ userId: newUserId })
      .where(eq(projects.id, projectId))
      .returning();

    await tx.insert(auditLogs).values({
      action: 'transfer',
      projectId,
      newUserId,
    });

    return project;
  });
}

// ❌ WRONG: No transaction for related operations
async transferOwnership(projectId: string, newUserId: string) {
  await this.db.db.update(projects).set({ userId: newUserId });
  await this.db.db.insert(auditLogs).values({ projectId }); // Can fail separately!
}
```

**Migration Workflow:**

```bash
# 1. Create/modify model in src/modules/*/models/*.model.ts
# 2. Export in src/database/schema/index.ts
export { projects } from '@modules/projects/models/project.model';

# 3. Generate migration
pnpm drizzle-kit generate

# 4. Review generated SQL
cat src/database/migrations/0001_*.sql

# 5. Run migration
pnpm drizzle-kit migrate
```

**Critical Issues Found:**

🔴 **ISSUE #1: Inconsistent Foreign Key Types**

```typescript
// ❌ FOUND in supervisors table - userId is text, should be uuid
userId: text('user_id').references(() => users.id);

// ✅ SHOULD BE (to match users.id which is uuid)
userId: uuid('user_id')
  .references(() => users.id, { onDelete: 'cascade' })
  .notNull()
  .unique();
```

**Location:** `src/modules/core/auth/models/user.model.ts` lines 69, 101  
**Impact:** Type mismatch between Supabase UUID and text can cause query failures  
**Fix:** Update `supervisors` and `students` tables to use `uuid('user_id')` instead of `text('user_id')`

---

## 3. Validation Strategy

### Library: class-validator

**Pattern:**

- ✅ DTOs use decorators for validation
- ✅ Global ValidationPipe in `main.ts`
- ✅ Custom validation error handling via `ValidationError` class

```typescript
// ✅ CORRECT: DTO validation
export class RegisterClientDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, {
    message:
      'Password must contain uppercase, lowercase, number, and special character',
  })
  password: string;
}

// ✅ CORRECT: Global ValidationPipe setup in main.ts
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  }),
);

// ✅ CORRECT: Throwing validation errors in services
const errors = await validate(dto);
if (errors.length > 0) {
  throw ValidationError.fromValidationErrors(errors);
}
```

---

## 4. Error Handling

### Module: Custom Error Module with Sentry

**Error Classes:**

- `AppError` - General application errors
- `ValidationError` - Input validation failures
- `BusinessError` - Business rule violations

## **Critical Pattern: Sentry Initialization Order**

```typescript
// ✅ CORRECT: main.ts initialization order
import { EnvironmentConfig } from './config/environment';

// STEP 1: Load environment FIRST
EnvironmentConfig.initialize();

// STEP 2: Import instrument.ts AFTER env is loaded
import './instrument';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // ...
}

// ❌ WRONG: Instrument imported before environment
import './instrument'; // SENTRY_DSN will be undefined!
import { EnvironmentConfig } from './config/environment';
EnvironmentConfig.initialize();
```

**Error Module Configuration:**

```typescript
// ✅ CORRECT: app.module.ts order
@Module({
  imports: [
    SentryModule.forRoot(),  // 1. Sentry first
    NotificationModule.register(),  // 2. Notification module
    ErrorModule.register({  // 3. Error module (depends on both)
      enableSentry: process.env.NODE_ENV === 'production',
      includeStackTrace: process.env.NODE_ENV === 'development',
      notifyFrontend: true,
      notificationStrategy: ErrorNotificationStrategy.OPERATIONAL,
    }),
  ],
})
```

**Error Usage:**

```typescript
// ✅ CORRECT: Using error codes
throw new AppError(ERROR_CODES.RESOURCE_NOT_FOUND, 'Project not found', {
  projectId: id,
});

// ✅ CORRECT: Business errors
throw new BusinessError('Cannot delete project with active tasks', {
  projectId,
  taskCount: 5,
});

// ✅ CORRECT: High severity errors (auto-reported to Sentry)
throw AppError.high(ERROR_CODES.DATABASE_ERROR, 'Database connection failed');

// ✅ CORRECT: Critical errors (non-operational, reported as fatal)
throw AppError.critical(ERROR_CODES.INTERNAL_SERVER_ERROR, 'System failure');
```

**Sensitive Data Sanitization:**

- Passwords, tokens, apiKeys automatically redacted in logs and Sentry
- Custom sensitive fields list in `ErrorService`

---

## 5. Notification System

### Pattern: WebSocket with Socket.IO

**Key Features:**

- ✅ Real-time push notifications to frontend
- ✅ Type-safe notification types: SUCCESS, ERROR, INFO, UPDATE
- ✅ Optional persistence for history
- ✅ Room-based broadcasting

```typescript
// ✅ CORRECT: Pushing notifications
await this.notificationService.push({
  type: NotificationType.SUCCESS,
  message: 'Project created successfully',
  context: { projectId: project.id, userId: user.id },
});

// ✅ CORRECT: Frontend connection
const socket = io('http://localhost:3000/notify');
socket.on('notification', (notification) => {
  switch (notification.type) {
    case 'SUCCESS':
      showSuccessToast(notification.message);
      break;
    case 'ERROR':
      showErrorToast(notification.message);
      break;
  }
});
```

---

## 6. Testing Conventions

### Structure: Unit + Integration Tests

**Patterns:**

```typescript
// ✅ CORRECT: Unit test structure
describe('AuthService', () => {
  let service: AuthService;
  let mockSupabase: jest.Mocked<SupabaseService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: SupabaseService, useValue: mockSupabase },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  it('should register client and send OTP', async () => {
    mockSupabase.createUser.mockResolvedValue(mockUser);
    mockSupabase.sendOTP.mockResolvedValue();

    const result = await service.registerClient(dto);

    expect(result.otpSent).toBe(true);
    expect(mockSupabase.sendOTP).toHaveBeenCalledWith(dto.email, 'signup');
  });
});

// ✅ CORRECT: Integration test structure
describe('AuthController E2E', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  it('POST /auth/register/client - should return pending status', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register/client')
      .send(validDto)
      .expect(201);

    expect(response.body.otpSent).toBe(true);
    expect(response.body).not.toHaveProperty('accessToken');
  });
});
```

**Test File Naming:**

- `*.spec.ts` - Unit tests
- `*.integration.spec.ts` - Integration tests
- `*.validation.spec.ts` - Validation-specific tests

---

## 7. Context Management

### Module: Custom Context Module (Request-scoped)

**Pattern:**

```typescript
// ✅ CORRECT: No manual middleware setup needed
@Module({
  imports: [
    ContextModule.register({
      adapter: ContextStorageAdapter.CLS,
      userIdSource: UserIdSource.JWT,
    }),
  ],
})
export class AppModule {}

// ✅ CORRECT: Using context in services
@Injectable()
export class ProjectService {
  constructor(private contextService: ContextService) {}

  async createProject(dto: CreateProjectDto) {
    const userId = this.contextService.getUserId();
    const orgId = this.contextService.getOrgId();

    return this.projectRepo.save({
      ...dto,
      createdBy: userId,
      organizationId: orgId,
    });
  }
}
```

**Auto-populated fields:**

- `userId`, `email`, `orgId`, `correlationId`, `path`, `method`, `timestamp`

---

## 8. API Documentation

### Pattern: Swagger with Custom Decorators

**Decorator Usage:**

```typescript
// ✅ CORRECT: Controller documentation
@ApiTags('projects')
@Controller('projects')
export class ProjectController {
  @Get()
  @ApiGetAll('projects', ProjectResponseDto)
  findAll() {}

  @Post()
  @ApiCreate('project', CreateProjectDto, ProjectResponseDto)
  create(@Body() dto: CreateProjectDto) {}

  @Put(':id')
  @ApiUpdate('project', UpdateProjectDto, ProjectResponseDto)
  update(@Param('id') id: string, @Body() dto: UpdateProjectDto) {}
}

// ✅ CORRECT: DTO documentation
export class CreateProjectDto {
  @ApiProperty({
    description: 'Project name',
    example: 'My Project',
  })
  @IsString()
  @IsNotEmpty()
  name: string;
}
```

**Location:** `/api/docs` in production

---

## 9. Codebase-Specific Patterns

### Module Organization

```markdown
src/
├── modules/
│ ├── core/ # Core business modules
│ │ └── auth/ # Authentication
│ └── shared/ # Shared utilities
│ ├── error/ # Error handling
│ ├── notification/ # WebSocket notifications
│ └── context/ # Request context
├── database/ # Database layer
│ ├── schema/ # Central schema exports
│ └── migrations/ # Generated migrations
├── config/ # Configuration files
└── utils/ # Utility functions
```

### Import Aliases

```typescript
// ✅ Use path aliases (configured in tsconfig.json)
import { User } from '@modules/core/auth/models/user.model';
import { DatabaseService } from '@database/database.service';
import { ERROR_CODES } from '@shared/error/constants';

// ❌ Don't use relative imports across modules
import { User } from '../../../core/auth/models/user.model';
```

---

## 10. Known Issues & Technical Debt

### 🔴 HIGH PRIORITY

#### **Issue #1: Foreign Key Type Mismatch**

- **Location:** `src/modules/core/auth/models/user.model.ts`
- **Problem:** `supervisors.userId` and `students.userId` use `text()` instead of `uuid()`
- **Impact:** Type mismatch with `users.id` which is UUID
- **Fix:**

  ```typescript
  // Change from:
  userId: text('user_id');

  // To:
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull()
    .unique();
  ```

- **Migration Required:** Yes - create migration to alter column type

#### **Issue #2: Sentry Initialization Order**

- **Location:** `src/main.ts`, `src/instrument.ts`
- **Problem:** Critical dependency on environment loading order
- **Risk:** If order is violated, Sentry DSN will be undefined
- **Prevention:** Document and enforce initialization order

### ⚠️ MEDIUM PRIORITY

#### **Issue #3: Test Timeouts in Gateway Tests**

- **Location:** `notification.gateway.spec.ts`
- **Problem:** Some tests require manual timeout increases
- **Current Workaround:** `jest.setTimeout(15000)` in specific tests
- **Better Solution:** Mock socket emissions more reliably

#### **Issue #4: No Logging Context Middleware**

- **Observation:** Context middleware has no `configure()` method
- **Current State:** Auto-configured via `ClsModule.forRoot()`
- **Documentation:** Could be clearer about this pattern

---

## 11. Environment Configuration

### Pattern: Centralized Config Class

```typescript
// ✅ CORRECT: Using EnvironmentConfig
import { EnvironmentConfig } from './config/environment';

// Initialize ONCE at app startup
EnvironmentConfig.initialize();

// Then use getters
const port = EnvironmentConfig.getPort();
const sentryEnabled = EnvironmentConfig.isSentryEnabled();

// ❌ WRONG: Direct process.env access scattered throughout
const port = parseInt(process.env.PORT || '3000', 10);
```

**Required Environment Variables:**

```bash
DATABASE_URL=postgresql://postgres:...@db.supabase.co:5432/postgres
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key
SENTRY_DSN=https://...@sentry.io/...
NODE_ENV=development|production
FRONTEND_URL=http://localhost:3000
PORT=3000
```

---

## 12. Agent Instructions for This Codebase

When implementing new features in this codebase:

### ✅ DO

1. **Authentication**: Always use OTP flow - never auto-create sessions during registration
2. **Database**: Always use UUIDs for primary keys, include timestamps, use transactions for multi-table operations
3. **Errors**: Use appropriate error classes (AppError, ValidationError, BusinessError) with proper codes
4. **Validation**: Always validate DTOs with class-validator decorators
5. **Documentation**: Add Swagger decorators to all endpoints
6. **Tests**: Write both unit tests and integration tests
7. **Context**: Use ContextService to get user info instead of passing manually
8. **Foreign Keys**: Always use `uuid()` type for foreign keys referencing UUID columns

### ❌ DON'T

1. Don't use `text()` for foreign keys that reference UUID primary keys
2. Don't return session tokens before OTP verification in registration flow
3. Don't import `instrument.ts` before `EnvironmentConfig.initialize()`
4. Don't use localStorage/sessionStorage in artifacts (not supported)
5. Don't create duplicate abstractions - check what exists first
6. Don't skip transactions for operations that modify multiple tables
7. Don't use Passport.js - use direct Supabase integration

### 🔍 Before Creating New Modules

1. Check if similar functionality exists in `shared/` modules
2. Verify the Error module can handle your error cases
3. Consider if you need notifications (use NotificationService)
4. Check if you need request context (use ContextService)
5. Review the auth guards - use `@Roles()` and `@Public()` appropriately

---

## Summary Checklist for New Features

Before submitting code:

- [ ] UUIDs used for all primary keys
- [ ] Foreign key types match referenced column types (uuid → uuid)
- [ ] Timestamps (createdAt, updatedAt) on all tables
- [ ] OTP flow respected (registration → OTP → verification → session)
- [ ] Transactions used for multi-table operations
- [ ] Proper error codes from ERROR_CODES constant
- [ ] class-validator decorators on all DTOs
- [ ] Swagger decorators on all endpoints
- [ ] Unit tests + integration tests written
- [ ] No sensitive data in error messages or logs
- [ ] Context service used where applicable
- [ ] Guards properly applied (@Roles, @Public)

---

**Module Version**: 1.0.0  
**Status**: Production Ready with minor issues documented  
**Last Audit**: January 2026
