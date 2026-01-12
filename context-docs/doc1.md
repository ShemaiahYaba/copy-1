# NestJS Execution Specification

> **Purpose**: This document defines the architectural standards, patterns, and constraints for all code generation and implementation in this NestJS project. Feed this to any AI agent before implementation.

---

## 1. Core Architecture Principles

### Single Responsibility Principle (SRP)

- Each class/module handles **one concern only**
- Controllers are thin: handle HTTP, delegate to services
- Services contain business logic
- Repositories handle data access
- DTOs/entities are separate from business models when appropriate

**Example**:

```typescript
// ❌ BAD: User class doing too much
class User {
  authenticate() {}
  sendWelcomeEmail() {}
  processPayment() {}
}

// ✅ GOOD: Separated concerns
class AuthService {
  authenticate() {}
}
class NotificationService {
  sendWelcomeEmail() {}
}
class PaymentService {
  processPayment() {}
}
```

### Open/Closed Principle (OCP)

- Extend functionality via composition, inheritance, or strategy patterns
- Don't modify existing tested code for new features
- Use interfaces/abstract classes for extensibility

### Dependency Inversion Principle (DIP)

- Depend on abstractions (interfaces), not concrete implementations
- High-level modules don't import low-level details
- Use dependency injection everywhere

**Example**:

```typescript
// ✅ Service depends on abstraction
constructor(
  @Inject('PAYMENT_GATEWAY') private paymentGateway: IPaymentGateway
) {}
```

### Keep it Simple, Stupid (KISS)

- Prefer straightforward solutions over clever ones
- No premature optimization
- If you can't explain it in one sentence, it's too complex

### Command-Query Separation (CQS)

- **Commands**: Mutate state, return void or success indicator
- **Queries**: Return data, never mutate state
- Name accordingly: `createUser()` vs `findUserById()`

### Separation of Concerns (SoC)

- **Controllers**: HTTP layer (routing, request/response mapping)
- **Services**: Business logic
- **Repositories**: Data access
- **Guards**: Authorization
- **Pipes**: Validation & transformation
- **Interceptors**: Cross-cutting concerns (logging, caching)

---

## 2. TypeScript Standards

### Type Safety

```typescript
// ✅ ALWAYS: Explicit typing
function processOrder(orderId: string, userId: string): Promise<Order> {}

// ❌ NEVER: Implicit any
function processOrder(orderId, userId) {}
```

### Strict Typing Rules

- Enable `strict: true` in tsconfig
- No `any` unless absolutely justified (document why)
- Use `unknown` for truly unknown types
- Prefer `interface` for public APIs, `type` for unions/intersections
- Use discriminated unions for state machines

### Type Definitions

```typescript
// ✅ Explicit return types
async findById(id: string): Promise<User | null> { }

// ✅ Branded types for domain concepts
type UserId = string & { readonly brand: unique symbol };
type OrderId = string & { readonly brand: unique symbol };

// ✅ Readonly by default
interface User {
  readonly id: string;
  readonly email: string;
}
```

---

## 3. Code Documentation Standards

### Inline Comments

- **WHY over WHAT**: Explain business rules, not syntax
- Comment complex algorithms, edge cases, or non-obvious behavior
- No redundant comments

```typescript
// ❌ BAD: States the obvious
// Loop through users
users.forEach((user) => {});

// ✅ GOOD: Explains business context
// Users without confirmed emails can't access premium features
// per security policy SEC-2024-15
users.filter((u) => u.emailConfirmed).forEach(grantPremiumAccess);
```

### JSDoc for Public APIs

```typescript
/**
 * Creates a new project with the specified owner.
 *
 * @param data - Project creation data
 * @param ownerId - User ID of the project owner
 * @returns The created project entity
 * @throws {UserNotFoundException} If owner doesn't exist
 * @throws {QuotaExceededException} If user exceeded project limit
 */
async createProject(
  data: CreateProjectDto,
  ownerId: string
): Promise<Project> { }
```

---

## 4. Testing Standards

### Structure

```markdown
src/
modules/
users/
users.service.ts
users.service.spec.ts # Unit tests
users.controller.ts
users.controller.integration.spec.ts # Integration tests
**tests**/
validation/ # Validation-specific tests
create-user.validation.spec.ts
execution/ # Execution-specific tests
create-user.execution.spec.ts
```

### Unit Tests

- Test business logic in isolation
- Mock all external dependencies
- Focus on behavior, not implementation
- One assertion concept per test (can be multiple expect calls)

```typescript
describe('UserService', () => {
  describe('createUser', () => {
    it('should hash password before saving', async () => {
      // Arrange, Act, Assert
    });

    it('should throw if email already exists', async () => {
      // Test error case
    });
  });
});
```

### Integration Tests: Validation

- Test input validation
- Test DTOs, pipes, guards
- No database hits (mock repository)

```typescript
describe('POST /users - Validation', () => {
  it('should reject invalid email format', async () => {
    await request(app).post('/users').send({ email: 'invalid' }).expect(400);
  });
});
```

### Integration Tests: Execution

- Test full request/response cycle
- Use test database or in-memory DB
- Test side effects (emails sent, events emitted)

```typescript
describe('POST /users - Execution', () => {
  it('should create user and send welcome email', async () => {
    const response = await request(app)
      .post('/users')
      .send(validUserData)
      .expect(201);

    // Verify DB state
    const user = await userRepo.findOne(response.body.id);
    expect(user).toBeDefined();

    // Verify side effect
    expect(emailService.sendWelcome).toHaveBeenCalledWith(user.email);
  });
});
```

---

## 5. Code Organization

### DRY via Helper Functions

- Extract repeated logic into utilities
- Keep helpers pure and focused
- Co-locate helpers with their domain

```typescript
// src/common/utils/date.utils.ts
export function addBusinessDays(date: Date, days: number): Date {}

// src/modules/orders/order.helpers.ts
export function calculateOrderTotal(items: OrderItem[]): Money {}
```

### Extension Pattern

```typescript
// Extend existing types cleanly
declare global {
  interface Array<T> {
    groupBy<K extends string | number>(keyFn: (item: T) => K): Record<K, T[]>;
  }
}
```

### Module Structure

```markdown
src/modules/users/
dto/
create-user.dto.ts
update-user.dto.ts
entities/
user.entity.ts
interfaces/
user-repository.interface.ts
users.controller.ts
users.service.ts
users.module.ts
```

---

## 6. NestJS-Specific Patterns

### Controllers (Thin Layer)

```typescript
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UseGuards(AuthGuard)
  @UsePipes(ValidationPipe)
  async create(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    // Only: call service, map response
    const user = await this.usersService.create(dto);
    return UserResponseDto.from(user);
  }
}
```

### Services (Business Logic)

```typescript
@Injectable()
export class UsersService {
  constructor(
    @Inject('USER_REPOSITORY') private repo: IUserRepository,
    private readonly emailService: EmailService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    // Business logic lives here
    const existing = await this.repo.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already exists');
    }

    const user = await this.repo.save(User.create(dto));

    // Side effects
    await this.emailService.sendWelcome(user.email);
    this.eventEmitter.emit('user.created', user);

    return user;
  }
}
```

### Error Handling

- Use NestJS built-in exceptions
- Create custom exceptions when needed
- Never swallow errors silently

```typescript
// Use standard exceptions
throw new NotFoundException(`User with ID ${id} not found`);

// Or custom domain exceptions
export class QuotaExceededException extends BadRequestException {
  constructor(userId: string, limit: number) {
    super(`User ${userId} exceeded quota of ${limit} projects`);
  }
}
```

---

## 7. Things to NEVER Do

- ❌ Don't use `any` without explicit justification
- ❌ Don't put business logic in controllers
- ❌ Don't skip validation (use DTOs + ValidationPipe)
- ❌ Don't create God classes (1000+ line files)
- ❌ Don't invent new architectural patterns without discussion
- ❌ Don't write tests that depend on execution order
- ❌ Don't mock what you don't own (mock your interfaces, not third-party libs directly)
- ❌ Don't commit commented-out code
- ❌ Don't use magic numbers/strings (use enums or constants)

---

## 8. When Implementing New Features

1. **Define types first** (interfaces, DTOs, entities)
2. **Write failing tests** (TDD approach preferred)
3. **Implement service layer** (business logic)
4. **Add controller layer** (HTTP mapping)
5. **Add validation** (DTOs with class-validator)
6. **Add integration tests** (validation + execution)
7. **Document public APIs** (JSDoc)

---

## 9. Agent Behavior Constraints

When generating code:

- **Ask before inventing**: If you need something that doesn't exist, ask first
- **Follow existing patterns**: Match the style of the codebase
- **Don't optimize prematurely**: Simple working code > clever code
- **Include tests**: Every feature needs unit + integration tests
- **Explain trade-offs**: If there are multiple approaches, explain why you chose one

---

## Summary Checklist

Before committing any generated code, verify:

- [ ] Explicit types everywhere
- [ ] Single responsibility per class
- [ ] Business logic in services, not controllers
- [ ] Unit tests for services
- [ ] Integration tests (validation + execution)
- [ ] Inline comments explain WHY, not WHAT
- [ ] No code duplication (DRY)
- [ ] Error cases handled
- [ ] Side effects documented and tested
- [ ] Follows existing project structure
