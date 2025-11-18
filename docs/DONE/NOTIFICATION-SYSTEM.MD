# Notification Module - Build Specification

## 🎯 Module Purpose

Enable the backend to send standardized, real-time notifications to the frontend through a unified channel. Frontend subscribes once and receives all system notifications (success, error, info, updates) in a consistent format.

---

## 📦 Module Overview

**Name:** `NotificationModule`  
**Type:** Feature Module (with WebSocket Gateway)  
**Dependencies:** `@nestjs/websockets`, `@nestjs/platform-socket.io`, `uuid`

---

## 🏗️ File Structure

```
src/notification/
├── dto/
│   ├── create-notification.dto.ts      # Input validation for creating notifications
│   ├── notification-config.dto.ts      # Module configuration
│   └── index.ts                        # Barrel export
├── types/
│   ├── notification.type.ts            # GraphQL type (if using GraphQL)
│   └── index.ts
├── interfaces/
│   ├── notification.interface.ts       # Core notification shape
│   └── index.ts
├── notification.service.ts             # Core business logic
├── notification.gateway.ts             # WebSocket gateway
├── notification.module.ts              # Module definition
├── __tests__/
│   ├── notification.service.spec.ts    # Unit tests for service
│   ├── notification.gateway.spec.ts    # Unit tests for gateway
│   └── notification.integration.spec.ts # Integration tests
└── README.md                           # Module documentation
```

---

## 📋 Core Components Specification

### 1. **Notification Interface**

**File:** `interfaces/notification.interface.ts`

```typescript
export enum NotificationType {
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
  INFO = 'INFO',
  UPDATE = 'UPDATE',
}

export interface INotification {
  id: string;
  type: NotificationType;
  message: string;
  context?: Record<string, any>;
  timestamp: Date;
}
```

**Purpose:** Define the contract for all notifications  
**Used by:** Service, Gateway, DTOs

---

### 2. **Create Notification DTO**

**File:** `dto/create-notification.dto.ts`

```typescript
import { IsEnum, IsString, IsOptional, IsObject } from 'class-validator';
import { NotificationType } from '../interfaces/notification.interface';

export class CreateNotificationDto {
  @IsEnum(NotificationType)
  type: NotificationType;

  @IsString()
  message: string;

  @IsOptional()
  @IsObject()
  context?: Record<string, any>;
}
```

**Purpose:** Validate input when creating notifications  
**Validations:**
- `type` must be valid enum value
- `message` must be non-empty string
- `context` is optional object

---

### 3. **Notification Config DTO**

**File:** `dto/notification-config.dto.ts`

```typescript
import { IsEnum, IsBoolean, IsOptional, IsNumber } from 'class-validator';

export enum NotificationAdapter {
  WEBSOCKET = 'websocket',
  DATABASE = 'database',
  QUEUE = 'queue',
}

export class NotificationConfigDto {
  @IsEnum(NotificationAdapter)
  adapter: NotificationAdapter = NotificationAdapter.WEBSOCKET;

  @IsBoolean()
  persist: boolean = false;

  @IsBoolean()
  enableLogging: boolean = true;

  @IsOptional()
  @IsNumber()
  maxRetries?: number = 3;
}
```

**Purpose:** Configure module behavior  
**Options:**
- `adapter`: How notifications are sent (websocket/db/queue)
- `persist`: Save notifications to database
- `enableLogging`: Log all notifications
- `maxRetries`: Retry failed sends (optional)

---

### 4. **Notification Service**

**File:** `notification.service.ts`

#### **Responsibilities:**
1. Create notifications with auto-generated ID and timestamp
2. Validate notification data
3. Emit notifications to subscribers
4. Optionally persist notifications
5. Handle failed sends with retry logic

#### **Public Methods:**

```typescript
class NotificationService {
  /**
   * Send a notification to all connected clients
   * @param dto - Notification data
   * @returns Created notification
   */
  async push(dto: CreateNotificationDto): Promise<INotification>

  /**
   * Broadcast notification to specific room/channel
   * @param room - Target room name
   * @param dto - Notification data
   */
  async broadcast(room: string, dto: CreateNotificationDto): Promise<INotification>

  /**
   * Get notification history (if persistence enabled)
   * @param filters - Query filters
   */
  async getHistory(filters?: NotificationFilters): Promise<INotification[]>

  /**
   * Subscribe to notification events (internal use)
   * @param callback - Function to call on new notification
   */
  subscribe(callback: (notification: INotification) => void): void
}
```

#### **Implementation Requirements:**

1. **Notification Creation:**
   - Auto-generate UUID for `id`
   - Auto-set `timestamp` to current time
   - Validate DTO before processing

2. **Subscription Management:**
   - Maintain array of subscriber callbacks
   - Call all subscribers when notification is pushed
   - Handle subscriber errors gracefully

3. **Persistence (if enabled):**
   - Save to database after successful validation
   - Include retry logic for failed saves
   - Log persistence errors

4. **Logging:**
   - Log all notifications if `enableLogging: true`
   - Format: `[NOTIFICATION] [TYPE] Message`
   - Include context in debug mode

---

### 5. **Notification Gateway**

**File:** `notification.gateway.ts`

#### **Responsibilities:**
1. Handle WebSocket connections on `/notify` namespace
2. Listen to NotificationService for new notifications
3. Emit notifications to connected clients
4. Handle client disconnections

#### **WebSocket Events:**

```typescript
@WebSocketGateway({ namespace: '/notify', cors: true })
class NotificationGateway {
  /**
   * Called when gateway initializes
   * Subscribe to notification service
   */
  afterInit(server: Server): void

  /**
   * Called when client connects
   * @param client - Connected socket client
   */
  handleConnection(client: Socket): void

  /**
   * Called when client disconnects
   * @param client - Disconnected socket client
   */
  handleDisconnect(client: Socket): void
}
```

#### **Implementation Requirements:**

1. **Initialization:**
   - Subscribe to NotificationService on init
   - Emit all notifications to `notification` event

2. **Connection Handling:**
   - Log client connections (with client ID)
   - Send welcome notification to new clients
   - Track active connections count

3. **Disconnection Handling:**
   - Log client disconnections
   - Clean up any client-specific data

4. **Broadcasting:**
   - Emit to all clients: `server.emit('notification', data)`
   - Support room-based broadcasting

---

### 6. **Notification Module**

**File:** `notification.module.ts`

#### **Configuration:**

```typescript
@Module({})
export class NotificationModule {
  static register(config?: NotificationConfigDto): DynamicModule {
    return {
      module: NotificationModule,
      providers: [
        NotificationService,
        NotificationGateway,
        {
          provide: 'NOTIFICATION_CONFIG',
          useValue: config || new NotificationConfigDto(),
        },
      ],
      exports: [NotificationService],
    };
  }
}
```

#### **Requirements:**

1. **Dynamic Module:**
   - Accept optional configuration
   - Provide default config if none given
   - Make config injectable via `NOTIFICATION_CONFIG` token

2. **Exports:**
   - Export `NotificationService` for use in other modules
   - Gateway is internal-only (not exported)

3. **Global Registration (Optional):**
   - Can be made global with `@Global()` decorator
   - Document when to use global vs local import

---

## 🧪 Test Specifications

### **Unit Tests: NotificationService**

**File:** `__tests__/notification.service.spec.ts`

#### **Test Cases:**

1. **Service Creation**
   - ✓ Should be defined
   - ✓ Should initialize with empty subscribers

2. **push() Method**
   - ✓ Should create notification with auto-generated ID
   - ✓ Should set timestamp to current time
   - ✓ Should validate input DTO
   - ✓ Should call all subscribers with notification
   - ✓ Should handle subscriber errors without crashing
   - ✓ Should return created notification

3. **broadcast() Method**
   - ✓ Should create notification with room context
   - ✓ Should call subscribers with room information
   - ✓ Should handle invalid room names

4. **subscribe() Method**
   - ✓ Should add callback to subscribers list
   - ✓ Should call new subscriber on next push()
   - ✓ Should support multiple subscribers

5. **Persistence (if enabled)**
   - ✓ Should save to database when persist: true
   - ✓ Should not save when persist: false
   - ✓ Should retry on failed save
   - ✓ Should log persistence errors

6. **Error Handling**
   - ✓ Should throw error on invalid notification type
   - ✓ Should throw error on empty message
   - ✓ Should handle malformed context gracefully

---

### **Unit Tests: NotificationGateway**

**File:** `__tests__/notification.gateway.spec.ts`

#### **Test Cases:**

1. **Gateway Initialization**
   - ✓ Should be defined
   - ✓ Should subscribe to NotificationService on init
   - ✓ Should set up WebSocket server

2. **Client Connection**
   - ✓ Should log client connection
   - ✓ Should increment active connections count
   - ✓ Should send welcome notification to new client

3. **Client Disconnection**
   - ✓ Should log client disconnection
   - ✓ Should decrement active connections count
   - ✓ Should clean up client data

4. **Notification Broadcasting**
   - ✓ Should emit notification to all clients
   - ✓ Should format notification correctly
   - ✓ Should handle socket emission errors

5. **Room Broadcasting**
   - ✓ Should emit to specific room only
   - ✓ Should not emit to clients outside room

---

### **Integration Tests**

**File:** `__tests__/notification.integration.spec.ts`

#### **Test Cases:**

1. **End-to-End Notification Flow**
   - ✓ Service.push() → Gateway receives → Client receives
   - ✓ Notification format matches INotification interface
   - ✓ Timestamp is accurate (within 1 second)
   - ✓ Context data is preserved

2. **Multiple Clients**
   - ✓ All connected clients receive notification
   - ✓ New clients don't receive old notifications
   - ✓ Disconnected clients don't receive notifications

3. **Configuration Impact**
   - ✓ Persistence saves to database when enabled
   - ✓ Logging outputs when enabled
   - ✓ Retries work as configured

4. **Error Scenarios**
   - ✓ Invalid notification is rejected
   - ✓ Gateway handles service errors gracefully
   - ✓ Failed persistence doesn't block notification

---

## 📊 Test Data

### **Valid Notification Samples:**

```typescript
// Success notification
{
  type: NotificationType.SUCCESS,
  message: 'Project created successfully',
  context: { projectId: '123', userId: '456' }
}

// Error notification
{
  type: NotificationType.ERROR,
  message: 'Failed to upload file',
  context: { error: 'File too large', maxSize: '5MB' }
}

// Info notification
{
  type: NotificationType.INFO,
  message: 'System maintenance scheduled',
  context: { scheduledAt: '2025-11-20T10:00:00Z' }
}

// Update notification
{
  type: NotificationType.UPDATE,
  message: 'Profile updated',
  context: { fields: ['name', 'email'] }
}
```

### **Invalid Notification Samples:**

```typescript
// Missing type
{
  message: 'Test message'
}

// Invalid type
{
  type: 'INVALID',
  message: 'Test message'
}

// Empty message
{
  type: NotificationType.INFO,
  message: ''
}

// Invalid context
{
  type: NotificationType.INFO,
  message: 'Test',
  context: 'not an object'
}
```

---

## 🔧 Configuration Examples

### **Basic Setup (WebSocket only):**
```typescript
@Module({
  imports: [
    NotificationModule.register()
  ]
})
export class AppModule {}
```

### **With Persistence:**
```typescript
@Module({
  imports: [
    NotificationModule.register({
      adapter: NotificationAdapter.WEBSOCKET,
      persist: true,
      enableLogging: true,
    })
  ]
})
export class AppModule {}
```

### **Production Setup:**
```typescript
@Module({
  imports: [
    NotificationModule.register({
      adapter: NotificationAdapter.WEBSOCKET,
      persist: true,
      enableLogging: false, // Reduce noise in production
      maxRetries: 5,
    })
  ]
})
export class AppModule {}
```

---

## 📝 Usage Examples

### **In a Service:**
```typescript
@Injectable()
export class ProjectService {
  constructor(private notificationService: NotificationService) {}

  async createProject(data: CreateProjectDto) {
    const project = await this.projectRepo.save(data);

    // Send success notification
    await this.notificationService.push({
      type: NotificationType.SUCCESS,
      message: 'Project created successfully',
      context: { projectId: project.id }
    });

    return project;
  }
}
```

### **Frontend (Client-side):**
```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000/notify');

socket.on('notification', (notification) => {
  console.log('Received:', notification);
  
  // Show toast based on type
  switch (notification.type) {
    case 'SUCCESS':
      showSuccessToast(notification.message);
      break;
    case 'ERROR':
      showErrorToast(notification.message);
      break;
    case 'INFO':
      showInfoToast(notification.message);
      break;
    case 'UPDATE':
      showUpdateBanner(notification.message);
      break;
  }
});
```

---

## ✅ Acceptance Criteria

Module is complete when:

1. ✅ All files are created per structure
2. ✅ All DTOs have proper validation decorators
3. ✅ Service has all required methods implemented
4. ✅ Gateway handles connections/disconnections
5. ✅ Module supports dynamic configuration
6. ✅ All unit tests pass (>80% coverage)
7. ✅ Integration tests pass
8. ✅ Example usage works end-to-end
9. ✅ README documents usage and configuration
10. ✅ No TypeScript errors or warnings

---

## 📦 Required Dependencies

```json
{
  "dependencies": {
    "@nestjs/websockets": "^10.0.0",
    "@nestjs/platform-socket.io": "^10.0.0",
    "socket.io": "^4.5.0",
    "uuid": "^9.0.0",
    "class-validator": "^0.14.0",
    "class-transformer": "^0.5.1"
  },
  "devDependencies": {
    "@types/uuid": "^9.0.0",
    "socket.io-client": "^4.5.0"
  }
}
```

---

## 🚀 Implementation Phases

### **Phase 1: Foundation (Day 1)**
- [ ] Create file structure
- [ ] Define interfaces and enums
- [ ] Create DTOs with validation
- [ ] Write README

### **Phase 2: Core Logic (Day 2)**
- [ ] Implement NotificationService
- [ ] Write service unit tests
- [ ] Implement subscriber pattern

### **Phase 3: WebSocket Layer (Day 3)**
- [ ] Implement NotificationGateway
- [ ] Wire service → gateway
- [ ] Write gateway unit tests

### **Phase 4: Integration (Day 4)**
- [ ] Create dynamic module
- [ ] Write integration tests
- [ ] Create example usage
- [ ] Test with real frontend

### **Phase 5: Polish (Day 5)**
- [ ] Add configuration options
- [ ] Add persistence (optional)
- [ ] Performance testing
- [ ] Documentation review

---

## 🎯 Success Metrics

- **Test Coverage:** >80%
- **Response Time:** <50ms for notification push
- **Concurrent Clients:** Support 1000+ without performance degradation
- **Memory Usage:** <100MB for 10,000 notifications
- **Error Rate:** <0.1% failed deliveries

---

## 📚 Documentation Requirements

**README.md must include:**
1. Quick start guide
2. Configuration options
3. Usage examples
4. WebSocket event documentation
5. Troubleshooting section
6. Performance considerations
7. Security notes (CORS, auth)

---

## 🔒 Security Considerations

1. **CORS Configuration:**
   - Configure allowed origins
   - Don't use `*` in production

2. **Authentication:**
   - Validate socket connections
   - Support JWT authentication middleware

3. **Rate Limiting:**
   - Limit notifications per client
   - Prevent spam/abuse

4. **Data Sanitization:**
   - Sanitize context data
   - Prevent XSS in messages

---

This specification provides everything needed to build a production-ready notification module. Follow it step-by-step, and you'll have a robust, testable, and maintainable system.