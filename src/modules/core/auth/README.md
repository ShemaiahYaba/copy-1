# Authentication Module

Enterprise-grade, type-safe authentication system for NestJS applications using **Supabase Auth**. Built with comprehensive guards, decorators, and seamless integration with Context, Notification, and Error modules.

## 📋 Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Type Safety](#type-safety)
- [API Endpoints](#api-endpoints)
- [Guards & Decorators](#guards--decorators)
- [Usage Examples](#usage-examples)
- [Integration](#integration)
- [Security](#security)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

---

## ✨ Features

### Core Authentication

- **Supabase Auth Backend** - Leverages Supabase's battle-tested authentication
- **JWT Token Management** - Access tokens + refresh tokens with automatic validation
- **4 User Roles** - Client, Supervisor, Student, University with role-specific profiles
- **Session Management** - Secure session handling with token refresh
- **Type-Safe Throughout** - Full TypeScript support with runtime type safety

### Developer Experience

- **No Passport.js Required** - Simple, direct implementation
- **Type-Safe Guards** - `@CurrentUser()` decorator with full type inference
- **Role-Based Access Control** - `@Roles()` decorator for fine-grained permissions
- **Public Routes** - `@Public()` decorator to bypass authentication
- **Comprehensive Testing** - Unit and integration tests included

### Integrations

- **Context Service** - Auto-populate user context on login
- **Notification Service** - Real-time auth event notifications
- **Error Handling** - Standardized errors with `AppError`
- **API Documentation** - Full Swagger/OpenAPI support

---

## 🏗️ Architecture

### Authentication Flow

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Frontend  │ ──────> │   NestJS    │ ──────> │  Supabase   │
│             │  Token  │   Backend   │   JWT   │    Auth     │
└─────────────┘         └─────────────┘         └─────────────┘
                              │
                              ▼
                        ┌─────────────┐
                        │  PostgreSQL │
                        │  (Profiles) │
                        └─────────────┘
```

### Key Components

```
auth/
├── decorators/           # @CurrentUser(), @Roles(), @Public()
├── guards/              # JwtAuthGuard, RolesGuard
├── services/            # SupabaseService, UserService
├── models/              # Database schemas (Drizzle ORM)
├── dto/                 # Request/Response DTOs
└── interfaces/          # TypeScript interfaces
```

### How It Works

1. **Registration**: Create Supabase user → Create local profile → Return tokens
2. **Login**: Verify with Supabase → Fetch profile → Populate context → Return tokens
3. **Protected Routes**: Extract token → Verify with Supabase → Fetch user → Attach to request
4. **Role Checks**: Read `@Roles()` metadata → Validate user role → Allow/Deny access

---

## 📦 Installation

### 1. Install Dependencies

```bash
pnpm add @supabase/supabase-js
pnpm add -D @types/node
```

### 2. Set Environment Variables

```bash
# .env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key
FRONTEND_URL=http://localhost:3000

DATABASE_URL=postgresql://user:pass@localhost:5432/gradlinq
```

### 3. Generate Database Migration

```bash
# Export schema
pnpm drizzle-kit generate

# Run migration
pnpm drizzle-kit migrate
```

### 4. Import Module

```typescript
// src/app.module.ts
import { AuthModule } from './modules/core/auth/auth.module';

@Module({
  imports: [
    DatabaseModule,
    ContextModule.register(),
    NotificationModule.register(),
    ErrorModule.register(),
    AuthModule, // ✅ Add here
  ],
})
export class AppModule {}
```

---

## 🚀 Quick Start

### Register a Client

```bash
curl -X POST http://localhost:3000/auth/register/client \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@company.com",
    "password": "SecurePass123!",
    "organizationName": "Acme Corp",
    "industry": "Technology"
  }'
```

**Response:**

```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john@company.com",
    "role": "client",
    "isActive": true,
    "createdAt": "2025-12-08T12:00:00Z"
  },
  "session": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "v1.MRjcAl-iNRhCfJECd...",
    "expiresAt": 1703721600
  },
  "profile": {
    "id": "client-123",
    "organizationName": "Acme Corp",
    "industry": "Technology"
  }
}
```

### Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@company.com",
    "password": "SecurePass123!"
  }'
```

### Make Authenticated Request

```bash
curl -X GET http://localhost:3000/projects \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 🛡️ Type Safety

This module provides **complete type safety** throughout your application.

### Type-Safe Request.user

```typescript
import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '@modules/auth/decorators';
import { User } from '@modules/auth/models/user.model';

@Controller('profile')
export class ProfileController {
  // ✅ Full type inference
  @Get()
  async getProfile(@CurrentUser() user: User) {
    // TypeScript knows all properties exist
    console.log(user.id); // string
    console.log(user.email); // string
    console.log(user.role); // 'client' | 'supervisor' | 'student' | 'university'
    console.log(user.isActive); // boolean

    return user;
  }

  // ✅ Extract specific property
  @Get('email')
  async getEmail(@CurrentUser('email') email: string) {
    return { email };
  }
}
```

### Type-Safe Role Checks

```typescript
import { hasRole, isActiveUser } from '@modules/auth/interfaces/auth.interface';

async updateProject(user: User) {
  // ✅ Type-safe role checking
  if (!hasRole(user, ['client', 'supervisor'])) {
    throw new ForbiddenException();
  }

  // ✅ Type-safe status checking
  if (!isActiveUser(user)) {
    throw new ForbiddenException('Account inactive');
  }
}
```

---

## 📖 API Endpoints

### Public Endpoints

| Method | Endpoint                    | Description             |
| ------ | --------------------------- | ----------------------- |
| POST   | `/auth/register/client`     | Register new client     |
| POST   | `/auth/register/supervisor` | Register new supervisor |
| POST   | `/auth/register/student`    | Register new student    |
| POST   | `/auth/register/university` | Register new university |
| POST   | `/auth/login`               | Login (all user types)  |
| POST   | `/auth/logout`              | Logout user             |
| POST   | `/auth/verify-session`      | Verify JWT token        |
| POST   | `/auth/refresh`             | Refresh access token    |

---

## 🛡️ Guards & Decorators

### Guards

#### JwtAuthGuard

Validates JWT tokens and attaches user to request.

```typescript
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@modules/auth/guards';

@Controller('projects')
@UseGuards(JwtAuthGuard) // ✅ Protect all routes
export class ProjectController {
  @Get()
  async getProjects(@CurrentUser() user: User) {
    // user is guaranteed to exist here
    return this.projectService.getProjectsForUser(user.id);
  }
}
```

#### RolesGuard

Enforces role-based access control.

```typescript
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard } from '@modules/auth/guards';
import { Roles } from '@modules/auth/decorators';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard) // ✅ Apply both guards
export class AdminController {
  @Get('dashboard')
  @Roles('university', 'supervisor') // ✅ Only these roles
  async getDashboard() {
    return { message: 'Admin dashboard' };
  }
}
```

### Decorators

#### @CurrentUser()

Extract authenticated user from request.

```typescript
// Get full user object
@Get('profile')
async getProfile(@CurrentUser() user: User) {
  return user;
}

// Get specific property
@Get('email')
async getEmail(@CurrentUser('email') email: string) {
  return { email };
}

// Get user ID
@Post('create')
async create(
  @CurrentUser('id') userId: string,
  @Body() dto: CreateDto,
) {
  return this.service.create(userId, dto);
}
```

#### @Roles()

Restrict route access to specific roles.

```typescript
// Single role
@Post('create-project')
@Roles('client')
async createProject() { }

// Multiple roles
@Get('dashboard')
@Roles('university', 'supervisor')
async getDashboard() { }
```

#### @Public()

Mark routes as public (bypass authentication).

```typescript
@Post('login')
@Public()
async login(@Body() dto: LoginDto) {
  return this.authService.login(dto);
}
```

---

## 💡 Usage Examples

### Example 1: Basic Protected Controller

```typescript
import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@modules/auth/guards';
import { CurrentUser } from '@modules/auth/decorators';
import { User } from '@modules/auth/models/user.model';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectController {
  constructor(private projectService: ProjectService) {}

  @Get()
  async getProjects(@CurrentUser() user: User) {
    return this.projectService.getProjectsForUser(user.id);
  }

  @Post()
  async createProject(
    @Body() dto: CreateProjectDto,
    @CurrentUser() user: User,
  ) {
    return this.projectService.create(dto, user.id);
  }
}
```

### Example 2: Role-Based Access Control

```typescript
import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard } from '@modules/auth/guards';
import { Roles, CurrentUser } from '@modules/auth/decorators';
import { User } from '@modules/auth/models/user.model';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  // Only clients can access
  @Get('clients')
  @Roles('client')
  async getClients() {
    return this.adminService.getClients();
  }

  // Multiple roles allowed
  @Get('dashboard')
  @Roles('university', 'supervisor')
  async getDashboard(@CurrentUser() user: User) {
    return this.adminService.getDashboard(user.role);
  }
}
```

### Example 3: Service Layer with Type Guards

```typescript
import { Injectable, ForbiddenException } from '@nestjs/common';
import { User } from '@modules/auth/models/user.model';
import { hasRole, isActiveUser } from '@modules/auth/interfaces/auth.interface';

@Injectable()
export class ProjectService {
  async createProject(dto: CreateProjectDto, user: User) {
    // ✅ Type-safe role check
    if (!hasRole(user, ['client'])) {
      throw new ForbiddenException('Only clients can create projects');
    }

    // ✅ Type-safe active check
    if (!isActiveUser(user)) {
      throw new ForbiddenException('Account is inactive');
    }

    // TypeScript knows user.id exists and is string
    return this.projectRepo.save({
      ...dto,
      createdBy: user.id,
    });
  }
}
```

### Example 4: Mixed Public/Protected Routes

```typescript
import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Public, CurrentUser } from '@modules/auth/decorators';
import { JwtAuthGuard } from '@modules/auth/guards';
import { User } from '@modules/auth/models/user.model';

@Controller('articles')
@UseGuards(JwtAuthGuard) // Default: all routes protected
export class ArticleController {
  // Public route - anyone can access
  @Get()
  @Public()
  async getArticles() {
    return this.articleService.getPublicArticles();
  }

  // Protected route - requires authentication
  @Get('my-articles')
  async getMyArticles(@CurrentUser() user: User) {
    return this.articleService.getArticlesForUser(user.id);
  }

  // Public route
  @Get(':id')
  @Public()
  async getArticle(@Param('id') id: string) {
    return this.articleService.getArticle(id);
  }
}
```

---

## 🔗 Integration

### Context Module

Auth automatically populates `ContextService` on login:

```typescript
// After login, context is populated
@Injectable()
export class ProjectService {
  constructor(private contextService: ContextService) {}

  async createProject(dto: CreateProjectDto) {
    const userId = this.contextService.getUserId(); // ✅ Available
    const email = this.contextService.get('email'); // ✅ Available
    const orgId = this.contextService.getOrgId(); // ✅ Available

    return this.projectRepo.save({
      ...dto,
      createdBy: userId,
      organizationId: orgId,
    });
  }
}
```

### Notification Module

Auth sends notifications for key events:

```typescript
// Registration success
NotificationType.SUCCESS: "Account created successfully! Welcome to Gradlinq."

// Login success
NotificationType.SUCCESS: "Welcome back, john@company.com!"

// Login failure
NotificationType.ERROR: "Login failed. Please check your credentials."

// Logout
NotificationType.INFO: "You have been logged out successfully."

// Access denied
NotificationType.ERROR: "Access denied. Insufficient permissions."
```

### Error Module

Auth uses standardized errors:

```typescript
// Invalid credentials
throw new AppError(
  ERROR_CODES.INVALID_CREDENTIALS,
  'Invalid email or password',
  { email: dto.email },
);

// Insufficient permissions
throw new AppError(ERROR_CODES.INSUFFICIENT_PERMISSIONS, 'Access denied', {
  requiredRoles: ['admin'],
  userRole: user.role,
});

// Account inactive
throw new AppError(ERROR_CODES.OPERATION_NOT_ALLOWED, 'Account is inactive', {
  userId: user.id,
});
```

---

## 🔒 Security

### Built-in Security Features

- ✅ **Bcrypt Password Hashing** (Supabase handles this)
- ✅ **JWT Token Validation** with expiry
- ✅ **Refresh Token Rotation**
- ✅ **Session Management** with automatic cleanup
- ✅ **Role-Based Access Control**
- ✅ **Account Activation** checks
- ✅ **Rate Limiting** (via Supabase)

### Password Requirements

```typescript
// Enforced in DTOs
@Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
  message: 'Password must contain uppercase, lowercase, number, and special character',
})
password: string;
```

**Requirements:**

- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character

**Example:** `SecurePass123!`

### Best Practices

1. ✅ **Always use HTTPS** in production
2. ✅ **Store tokens securely** (httpOnly cookies recommended)
3. ✅ **Implement token refresh** before expiry
4. ✅ **Validate tokens on every request** (handled by guard)
5. ✅ **Use role-based access control** with `@Roles()`
6. ✅ **Enable Supabase security features** (rate limiting, etc.)
7. ✅ **Monitor failed login attempts**
8. ✅ **Implement account lockout** after N failed attempts

---

## 🧪 Testing

### Unit Tests

```bash
# Test auth service
pnpm test auth.service.spec.ts

# Test Supabase service
pnpm test supabase.service.spec.ts

# Test user service
pnpm test user.service.spec.ts
```

### Integration Tests

```bash
# Run all integration tests
pnpm test auth.integration.spec.ts

# With coverage
pnpm test -- --coverage auth
```

### Test Examples

```typescript
describe('AuthService', () => {
  it('should register new client', async () => {
    const dto = {
      email: 'test@company.com',
      password: 'SecurePass123!',
      organizationName: 'Test Corp',
    };

    const result = await authService.registerClient(dto);

    expect(result.user.email).toBe(dto.email);
    expect(result.user.role).toBe('client');
    expect(result.session.accessToken).toBeDefined();
  });

  it('should login with valid credentials', async () => {
    const result = await authService.login({
      email: 'test@company.com',
      password: 'SecurePass123!',
    });

    expect(result.user).toBeDefined();
    expect(result.session).toBeDefined();
  });
});
```

---

## 🐛 Troubleshooting

### Common Issues

#### 1. "User already exists"

**Cause**: Email already registered in Supabase

**Solution**:

```typescript
// Check if user exists before registration
const existing = await userService.findByEmail(dto.email);
if (existing) {
  throw new AppError(ERROR_CODES.ALREADY_EXISTS, 'Email already exists');
}
```

#### 2. "Invalid or expired token"

**Cause**: JWT token expired or invalid

**Solution**:

```typescript
// Implement token refresh
const refreshToken = localStorage.getItem('refreshToken');
const { accessToken } = await fetch('/auth/refresh', {
  method: 'POST',
  body: JSON.stringify({ refreshToken }),
});
localStorage.setItem('accessToken', accessToken);
```

#### 3. "Supabase connection failed"

**Cause**: Wrong environment variables

**Solution**:

```bash
# Verify .env file
SUPABASE_URL=https://your-project.supabase.co  # Must include https://
SUPABASE_SERVICE_ROLE_KEY=eyJhb...            # Service role key, not anon key
```

#### 4. "User not found in database"

**Cause**: User exists in Supabase but not in local database

**Solution**:

```typescript
// This shouldn't happen due to transactions
// If it does, check transaction rollback logs
// Ensure createUser and database insert are in same transaction
```

#### 5. "Access denied" / "Insufficient permissions"

**Cause**: User doesn't have required role

**Solution**:

```typescript
// Check user role
console.log('User role:', user.role);
console.log('Required roles:', ['admin', 'client']);

// Verify @Roles() decorator is correct
@Roles('client', 'supervisor') // ✅ Multiple roles
async createProject() { }
```

### Debug Logging

Enable debug logging in `JwtAuthGuard`:

```typescript
// guards/jwt-auth.guard.ts
this.logger.debug(`User authenticated: ${user.email} (${user.role})`);
```

Enable Supabase logging:

```typescript
// services/supabase.service.ts
this.logger.log(`User signed in: ${email}`);
this.logger.error('Sign in failed:', error);
```

---

## 📊 Comparison: Supabase vs Passport.js

| Feature            | This Module (Supabase) | Passport.js           |
| ------------------ | ---------------------- | --------------------- |
| Setup Complexity   | ✅ Simple              | ❌ Complex            |
| JWT Validation     | ✅ Built-in            | ❌ Manual             |
| Token Refresh      | ✅ Automatic           | ❌ Manual             |
| Password Hashing   | ✅ Built-in            | ❌ Manual (bcrypt)    |
| Session Management | ✅ Built-in            | ❌ Manual             |
| Rate Limiting      | ✅ Built-in            | ❌ Manual             |
| Email Verification | ✅ Built-in            | ❌ Manual             |
| Password Reset     | ✅ Built-in            | ❌ Manual             |
| OAuth2 Support     | ✅ Built-in            | ✅ With strategies    |
| Type Safety        | ✅ Full TypeScript     | ⚠️ Partial            |
| Testing            | ✅ Easy to mock        | ⚠️ Complex strategies |

---

## 🎯 Key Benefits

### For Developers

- **No Passport Configuration** - Direct, simple implementation
- **Full Type Safety** - TypeScript throughout the stack
- **Easy Testing** - Mock services, not strategies
- **Clear Errors** - Standardized error handling
- **Familiar Decorators** - `@CurrentUser()`, `@Roles()`, `@Public()`

### For Applications

- **Production Ready** - Battle-tested Supabase backend
- **Scalable** - Handles millions of users
- **Secure** - Industry-standard JWT + bcrypt
- **Fast** - Minimal overhead, direct validation
- **Maintainable** - Clean, readable code

---

## 📄 License

MIT License

---

**Module Version**: 2.0.0 (Supabase)  
**Last Updated**: December 08, 2025  
**Status**: Production Ready ✅
