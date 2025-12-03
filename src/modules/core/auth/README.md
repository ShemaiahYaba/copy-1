# Authentication Module (Appwrite Integration)

Production-ready authentication system for Gradlinq using **Appwrite** as the authentication backend. Supports 4 user types (Client, Supervisor, Student, University) with seamless integration with Context, Notification, and Error modules.

## 📋 Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Installation](#installation)
- [Appwrite Setup](#appwrite-setup)
- [Quick Start](#quick-start)
- [API Endpoints](#api-endpoints)
- [Authentication Flow](#authentication-flow)
- [Session Management](#session-management)
- [Integration](#integration)
- [Frontend Integration](#frontend-integration)
- [Security](#security)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

---

## ✨ Features

- **Appwrite Backend**: Leverages Appwrite for secure authentication
- **4 User Types**: Client, Supervisor, Student, University with role-specific profiles
- **Session Management**: Appwrite sessions with automatic expiry
- **Email/Password Auth**: Secure authentication with Appwrite's built-in security
- **Context Integration**: Auto-populate ContextService on login
- **Real-time Notifications**: Success/error notifications for auth events
- **Comprehensive Error Handling**: Standardized errors with AppError
- **Full API Documentation**: Swagger/OpenAPI documentation
- **No JWT Management**: Appwrite handles all token/session management

---

## 🏗️ Architecture

### How It Works

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Frontend  │ ──────> │   NestJS    │ ──────> │  Appwrite   │
│             │         │   Backend   │         │   Backend   │
└─────────────┘         └─────────────┘         └─────────────┘
                              │
                              ▼
                        ┌─────────────┐
                        │  PostgreSQL │
                        │  (Profiles) │
                        └─────────────┘
```

### Data Flow

1. **Registration**:
   - User → NestJS → Create Appwrite account
   - Appwrite → Returns user + session
   - NestJS → Store user profile in PostgreSQL
   - NestJS → Return session to frontend

2. **Login**:
   - User → NestJS → Authenticate with Appwrite
   - Appwrite → Returns session
   - NestJS → Fetch profile from PostgreSQL
   - NestJS → Populate Context, send notification
   - NestJS → Return session + profile

3. **Protected Routes**:
   - Frontend → Sends sessionId in header
   - NestJS → Verify session with Appwrite
   - NestJS → Fetch user from PostgreSQL
   - NestJS → Process request

---

## 📦 Installation

### 1. Install Dependencies

```bash
pnpm add node-appwrite
```

### 2. Set Environment Variables

```bash
# .env
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your-project-id-here
APPWRITE_API_KEY=your-api-key-here

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
import { AuthModule } from './modules/auth/auth.module';

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

## 🚀 Appwrite Setup

### 1. Create Appwrite Project

1. Go to [Appwrite Console](https://cloud.appwrite.io/console)
2. Create new project: **"Gradlinq"**
3. Copy Project ID

### 2. Enable Email/Password Auth

1. Navigate to **Auth** → **Settings**
2. Enable **Email/Password** authentication
3. Configure session limits and security settings

### 3. Create API Key

1. Navigate to **Overview** → **API Keys**
2. Create new API key with these scopes:
   - `users.read`
   - `users.write`
   - `sessions.read`
   - `sessions.write`
3. Copy the API key

### 4. Configure CORS (for frontend)

1. Navigate to **Settings** → **Platforms**
2. Add Web Platform
3. Add your frontend URLs:
   - `http://localhost:3000` (development)
   - `https://yourdomain.com` (production)

### 5. Optional: Configure Email Templates

1. Navigate to **Auth** → **Templates**
2. Customize email templates for:
   - Email verification
   - Password recovery
   - Magic URL login

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
    "createdAt": "2025-11-23T12:00:00Z"
  },
  "session": {
    "sessionId": "5e5ea5c16897e",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "expire": "2025-11-30T12:00:00.000Z"
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

### Logout

```bash
curl -X POST http://localhost:3000/auth/logout \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "5e5ea5c16897e"
  }'
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
| POST   | `/auth/verify-session`      | Verify session validity |
| POST   | `/auth/session`             | Get session details     |

---

## 🔐 Authentication Flow

### Registration Flow

```
User submits registration
    ↓
Validate email uniqueness (local DB)
    ↓
Create Appwrite account
    ↓
Create Appwrite session (auto-login)
    ↓
Create user + role-specific profile (PostgreSQL)
    ↓
Populate ContextService
    ↓
Send success notification
    ↓
Return user + session + profile
```

### Login Flow

```
User submits email + password
    ↓
Authenticate with Appwrite
    ↓
Appwrite validates credentials
    ↓
Appwrite creates session
    ↓
Fetch user profile (PostgreSQL)
    ↓
Check account is active
    ↓
Populate ContextService
    ↓
Send welcome notification
    ↓
Return user + session + profile
```

### Session Verification Flow

```
Frontend sends sessionId
    ↓
Verify session with Appwrite
    ↓
Fetch user from PostgreSQL
    ↓
Return user data
```

---

## 🎫 Session Management

### How Sessions Work

- **Appwrite manages all sessions** (no manual JWT handling)
- Sessions are **automatically created** on login/registration
- Sessions have **configurable expiry** (default: 1 year)
- Sessions can be **invalidated** on logout
- **Multiple sessions** supported (multi-device login)

### Session Storage

Frontend should store the `sessionId` returned from login:

```typescript
// Store session
localStorage.setItem('sessionId', session.sessionId);

// Include in requests
const response = await fetch('/api/protected-route', {
  headers: {
    'X-Session-Id': localStorage.getItem('sessionId'),
  },
});
```

### Session Validation

Backend validates session with Appwrite:

```typescript
// In your middleware/guard
const session = await appwriteService.getSession(sessionId);
// If valid, continue. If invalid/expired, throw 401
```

---

## 🔗 Integration

### Context Module

Auth automatically populates `ContextService` on login:

```typescript
// After login, context is populated
this.contextService.getUserId(); // ✅ Returns user ID
this.contextService.getOrgId(); // ✅ Returns org/university ID

// Use in any service
@Injectable()
export class ProjectService {
  constructor(private contextService: ContextService) {}

  async createProject(dto: CreateProjectDto) {
    const userId = this.contextService.getUserId();
    return this.projectRepo.save({ ...dto, createdBy: userId });
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
```

---

## 💻 Frontend Integration

### React Example

```typescript
import { useState } from 'react';

function AuthProvider({ children }) {
  const [session, setSession] = useState(null);

  async function register(email, password, organizationName, role = 'client') {
    const response = await fetch(`/api/auth/register/${role}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, organizationName }),
    });

    const data = await response.json();

    // Store session
    localStorage.setItem('sessionId', data.session.sessionId);
    setSession(data.session);

    return data;
  }

  async function login(email, password) {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    localStorage.setItem('sessionId', data.session.sessionId);
    setSession(data.session);

    return data;
  }

  async function logout() {
    const sessionId = localStorage.getItem('sessionId');

    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });

    localStorage.removeItem('sessionId');
    setSession(null);
  }

  async function verifySession() {
    const sessionId = localStorage.getItem('sessionId');
    if (!sessionId) return null;

    const response = await fetch('/api/auth/verify-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });

    if (response.ok) {
      return await response.json();
    }

    return null;
  }

  return (
    <AuthContext.Provider value={{ session, register, login, logout, verifySession }}>
      {children}
    </AuthContext.Provider>
  );
}
```

### Making Authenticated Requests

```typescript
// Include sessionId in headers
const response = await fetch('/api/projects', {
  headers: {
    'Content-Type': 'application/json',
    'X-Session-Id': localStorage.getItem('sessionId'),
  },
});
```

---

## 🔒 Security

### Appwrite Security Features

- ✅ **Argon2** password hashing (built-in)
- ✅ **Rate limiting** on auth endpoints
- ✅ **Session management** with automatic expiry
- ✅ **HTTPS-only** in production
- ✅ **CORS protection**
- ✅ **IP whitelisting** (optional)

### Password Requirements

- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character

**Example:** `SecurePass123!`

### Best Practices

1. ✅ **Store sessionId securely** (httpOnly cookies recommended)
2. ✅ **Validate session on each request**
3. ✅ **Use HTTPS** in production
4. ✅ **Enable Appwrite security features** (rate limiting, etc.)
5. ✅ **Implement CORS** properly
6. ✅ **Monitor failed login attempts**
7. ✅ **Rotate sessions** periodically

---

## 🧪 Testing

### Environment Setup

```bash
# Test environment
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=test-project-id
APPWRITE_API_KEY=test-api-key
```

### Run Tests

```bash
# All auth tests
pnpm test auth

# With coverage
pnpm test -- --coverage auth

# Integration tests
pnpm test auth.integration.spec.ts
```

---

## 🐛 Troubleshooting

### Common Issues

#### 1. "Appwrite Error: User already exists"

**Cause**: Email already registered in Appwrite

**Solution**: Use different email or check Appwrite console

#### 2. "Invalid session"

**Cause**: Session expired or invalidated

**Solution**: Login again to get new session

#### 3. "Appwrite connection failed"

**Cause**: Wrong endpoint or project ID

**Solution**: Verify environment variables

```bash
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1  # Correct endpoint
APPWRITE_PROJECT_ID=your-actual-project-id
```

#### 4. "CORS error"

**Cause**: Frontend URL not whitelisted in Appwrite

**Solution**: Add frontend URL in Appwrite Console → Platforms

#### 5. "User profile not found"

**Cause**: User exists in Appwrite but not in PostgreSQL

**Solution**: This shouldn't happen. Check transaction rollback logs.

### Debug Logging

Enable Appwrite debug logs:

```typescript
// In appwrite.service.ts
this.client.setEndpoint(endpoint).setProject(projectId);

// Add debug logging
this.logger.debug(`Appwrite initialized: ${endpoint}, Project: ${projectId}`);
```

---

## 🔮 Future Enhancements

- [ ] OAuth2 login (Google, GitHub, etc.) - Appwrite supports this
- [ ] Two-factor authentication - Appwrite supports this
- [ ] Email verification - Appwrite supports this
- [ ] Password reset - Appwrite supports this
- [ ] Magic URL login - Appwrite supports this
- [ ] Phone authentication - Appwrite supports this
- [ ] Anonymous sessions - Appwrite supports this

---

## 📊 Appwrite vs Custom JWT

| Feature            | Appwrite             | Custom JWT               |
| ------------------ | -------------------- | ------------------------ |
| Password Hashing   | ✅ Built-in (Argon2) | ❌ Manual implementation |
| Session Management | ✅ Automatic         | ❌ Manual implementation |
| Rate Limiting      | ✅ Built-in          | ❌ Manual implementation |
| Email Verification | ✅ Built-in          | ❌ Manual implementation |
| Password Reset     | ✅ Built-in          | ❌ Manual implementation |
| OAuth2             | ✅ Built-in          | ❌ Manual implementation |
| 2FA                | ✅ Built-in          | ❌ Manual implementation |
| Multi-device       | ✅ Built-in          | ❌ Manual implementation |
| Security Updates   | ✅ Automatic         | ❌ Manual                |

---

## 📄 License

MIT License

---

**Module Version**: 2.0.0 (Appwrite)  
**Last Updated**: November 23, 2025  
**Status**: Production Ready ✅
