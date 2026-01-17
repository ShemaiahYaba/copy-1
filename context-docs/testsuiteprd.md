# Test Suite PRD: Core Modules Testing Specification

**Version:** 1.0  
**Date:** January 2026  
**Status:** Ready for Implementation  
**Target:** Bookmarks, Experiences, Teams, Projects Core Modules

---

## 1. Executive Summary

Generate comprehensive test suites for all core modules following the **Core + Domain architecture pattern**. Tests must validate **CRUD operations**, **multi-tenant isolation**, and **ownership authorization** while explicitly excluding presentation logic and role-specific orchestration (which belong in domain modules).

---

## 2. Testing Philosophy

### 2.1 Core Module Testing Principles

**Test ONLY:**

- ✅ Database operations (Create, Read, Update, Delete)
- ✅ Multi-tenant filtering (universityId enforcement)
- ✅ Ownership validation (createdBy checks)
- ✅ Core business rules (status transitions, constraints)
- ✅ Authorization (role-based access control)

**Do NOT Test:**

- ❌ Presentation logic (formatting, truncation, enrichment)
- ❌ Role-specific orchestration (student feed mapping, dashboard aggregation)
- ❌ Implementation details (default field values, internal counters)
- ❌ Domain-specific calculations (match scores, eligibility)

### 2.2 Test Coverage Targets

| Test Type                   | Target Coverage | Priority    |
| --------------------------- | --------------- | ----------- |
| Multi-tenant isolation      | 100%            | 🔴 Critical |
| Ownership authorization     | 100%            | 🔴 Critical |
| Unit tests (CRUD)           | 80%+            | 🔴 Critical |
| Integration tests (GraphQL) | 60%+            | 🟡 High     |

---

## 3. Test Structure Standard

### 3.1 File Naming Convention

```markdown
src/modules/core/{module}/_tests_/
├── {module}.service.spec.ts # Unit tests
├── {module}.resolver.spec.ts # Integration tests (optional)
└── {module}.integration.spec.ts # E2E tests (future)
```

### 3.2 Test File Template

```typescript
describe('{ModuleName}Service', () => {
  let service: {ModuleName}Service;
  let mockDb: jest.Mocked<DatabaseService>;
  let mockContext: jest.Mocked<ContextService>;
  let mockNotification: jest.Mocked<NotificationService>;
  let mockDependency: jest.Mocked<DependencyService>; // If applicable

  beforeEach(async () => {
    // Mock setup with default context
    mockContext = {
      getContext: jest.fn().mockReturnValue({
        userId: 'user-123',
        universityId: 'univ-456',
        studentId: 'student-123', // If applicable
      }),
      getUserId: jest.fn().mockReturnValue('user-123'),
    } as any;

    // Mock database service
    mockDb = {
      db: {
        select: jest.fn(),
        insert: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    } as any;

    // Mock notification service
    mockNotification = {
      push: jest.fn().mockResolvedValue(undefined),
    } as any;

    // Create testing module
    const module = await Test.createTestingModule({
      providers: [
        {ModuleName}Service,
        { provide: DatabaseService, useValue: mockDb },
        { provide: ContextService, useValue: mockContext },
        { provide: NotificationService, useValue: mockNotification },
        // Add other dependencies
      ],
    }).compile();

    service = module.get({ModuleName}Service);
  });

  describe('Multi-Tenancy & Context', () => {
    // Tests here
  });

  describe('create', () => {
    // Tests here
  });

  // Additional test groups
});
```

### 3.3 Test Organization Pattern

Group tests by:

1. **Multi-Tenancy & Context** (always first)
2. **CRUD Operations** (create, findAll, findById, update, delete)
3. **Business Rules** (status transitions, constraints)
4. **Authorization** (ownership checks, role guards)

---

## 4. Module-Specific Test Specifications

### 4.1 Bookmarks Module (~30 tests)

**Location:** `src/modules/core/bookmarks/_tests_/bookmarks.service.spec.ts`

**Status:** ✅ Already implemented (reference implementation)

**Test Groups:**

#### 4.1.1 Multi-Tenancy & Context (4 tests)

- Should filter bookmarks by universityId from context
- Should throw error when universityId is missing in context
- Should throw error when studentId is missing in context
- Should not return bookmarks from other universities

#### 4.1.2 Create Bookmark (8 tests)

- Should create bookmark successfully with valid data
- Should auto-assign universityId from context
- Should throw error if user not authenticated
- Should throw error if project not found (via ProjectsService.findById)
- Should throw error if project belongs to different university
- Should throw error if bookmark already exists (duplicate check)
- Should throw error if bookmark limit reached (100 max)
- Should emit success notification

#### 4.1.3 Find All Bookmarks (5 tests)

- Should return paginated bookmarks with tenant filtering
- Should filter by sharedBy status (CREATED/SHARED/ALL)
- Should search by project title/description
- Should sort by createdAt (asc/desc)
- Should return correct pagination metadata

#### 4.1.4 Find One Bookmark (3 tests)

- Should return bookmark by ID with tenant validation
- Should throw error if bookmark not found
- Should throw error if not owner of bookmark

#### 4.1.5 Delete Bookmark (4 tests)

- Should delete bookmark successfully by ID
- Should validate ownership before deletion
- Should throw error if not owner
- Should emit notification

#### 4.1.6 Delete by Project ID (2 tests)

- Should delete bookmark by projectId
- Should validate tenant and ownership

#### 4.1.7 Bulk Delete (3 tests)

- Should delete multiple bookmarks successfully
- Should validate all bookmark IDs belong to user
- Should throw error if some IDs are invalid

#### 4.1.8 Search Bookmarks (2 tests)

- Should search by project title/description
- Should filter by universityId

#### 4.1.9 Get Bookmark Count (3 tests)

- Should return correct count for authenticated student
- Should return 0 if not authenticated
- Should filter by universityId

#### 4.1.10 Integration Tests (2 tests)

- Should require JWT authentication for all operations
- Should restrict to student role only

---

### 4.2 Experiences Module (~25 tests)

**Location:** `src/modules/core/experiences/_tests_/experiences.service.spec.ts`

**Status:** ❌ Not implemented

**Dependencies to Mock:**

- `DatabaseService`
- `ContextService`
- `NotificationService`

**Test Groups:**

#### 4.2.1 Multi-Tenancy & Context (3 tests)

- Should filter experiences by universityId from context
- Should throw error when universityId is missing
- Should not return experiences from other universities

#### 4.2.2 Create Experience (4 tests)

- Should create experience successfully with valid data
- Should auto-assign universityId and createdBy from context
- Should default status to DRAFT
- Should throw error if user not authenticated

#### 4.2.3 Find All Experiences (5 tests)

- Should return paginated experiences with tenant filtering
- Should filter by status (DRAFT/PUBLISHED/ARCHIVED)
- Should search by title/overview/courseCode
- Should sort by createdAt/title (asc/desc)
- Should return correct pagination metadata

#### 4.2.4 Find By ID (2 tests)

- Should return experience by ID with tenant validation
- Should throw error if experience not found

#### 4.2.5 Update Experience (3 tests)

- Should update experience successfully
- Should validate ownership (createdBy matches userId)
- Should throw error if not owner

#### 4.2.6 Publish Experience (4 tests)

- Should transition DRAFT → PUBLISHED
- Should validate ownership before publishing
- Should throw error if missing required fields (overview, expectedOutcomes, mainContact)
- Should set publishedAt timestamp

#### 4.2.7 Archive Experience (3 tests)

- Should transition PUBLISHED → ARCHIVED
- Should validate ownership
- Should set archivedAt timestamp

#### 4.2.8 Delete Experience (3 tests)

- Should delete experience if status is DRAFT
- Should throw error if status is not DRAFT
- Should validate ownership

#### 4.2.9 Integration Tests (2 tests)

- Should require JWT authentication
- Should allow student and supervisor roles for mutations

**Special Testing Notes:**

- Mock `ContextService.getContext()` to return `{ userId, universityId }`
- Use Drizzle query mocking pattern from bookmarks tests
- Test status transitions thoroughly (DRAFT → PUBLISHED → ARCHIVED)
- Validate required fields check in `publish()` method

---

### 4.3 Teams Module (~25 tests)

**Location:** `src/modules/core/teams/_tests_/teams.service.spec.ts`

**Status:** ❌ Not implemented

**Dependencies to Mock:**

- `DatabaseService`
- `ContextService`
- `NotificationService`

**Test Groups:**

#### 4.3.1 Multi-Tenancy & Context (3 tests)

- Should filter teams by universityId from context
- Should throw error when universityId is missing
- Should not return teams from other universities

#### 4.3.2 Create Team (4 tests)

- Should create team successfully with valid data
- Should auto-assign universityId and createdBy from context
- Should default status to ACTIVE
- Should auto-create LEAD assignment for creator with full permissions
- Should throw error if user not authenticated

#### 4.3.3 Find All Teams (5 tests)

- Should return paginated teams with tenant filtering
- Should filter by status/projectId/supervisorId
- Should search by team name/description
- Should sort by createdAt/name (asc/desc)
- Should return correct pagination metadata

#### 4.3.4 Find By ID (2 tests)

- Should return team by ID with tenant validation
- Should throw error if team not found

#### 4.3.5 Find By Student ID (3 tests)

- Should return teams for authenticated student
- Should filter by ACTIVE assignments only
- Should throw error if universityId missing

#### 4.3.6 Update Team (3 tests)

- Should update team successfully
- Should validate edit permission (canEditTeam or creator)
- Should throw error if no edit permission

#### 4.3.7 Add Member (5 tests)

- Should add member successfully
- Should validate invite permission (canInviteMembers or creator)
- Should throw error if team at max capacity
- Should throw error if user already assigned to team
- Should emit notification

#### 4.3.8 Integration Tests (2 tests)

- Should require JWT authentication
- Should allow all authenticated roles

**Special Testing Notes:**

- Mock TWO database operations for `create()`: (1) insert team, (2) insert team assignment
- Mock `findByStudentId()` to query `teamAssignments` table first
- Test permission checks via public methods (update, addMember)
- Use `inArray()` Drizzle operator for `findByStudentId`

---

### 4.4 Projects Module (~35 tests)

**Location:** `src/modules/core/projects/_tests_/projects.service.spec.ts`

**Status:** ⚠️ Partially implemented (only create test exists)

**Dependencies to Mock:**

- `DatabaseService`
- `ContextService`
- `NotificationService`

**Test Groups:**

#### 4.4.1 Multi-Tenancy & Context (3 tests)

- Should validate universityId via findById
- Should throw error when universityId is missing
- Should not return projects from other universities

#### 4.4.2 Create Project (5 tests)

- Should create project successfully with valid data
- Should auto-assign universityId and createdBy from context
- Should fetch clientId from clients table
- Should throw error if user not a client
- Should throw error if user not authenticated

#### 4.4.3 Find By ID (3 tests)

- Should return project by ID with tenant validation
- Should throw error if project not found
- Should NOT increment view count (different from findOne)

#### 4.4.4 Find All Projects (8 tests)

- Should return paginated projects
- Should filter by status/approvalStatus/category
- Should filter by industry/isRemote/isPublished/isAvailable
- Should filter by requiredSkills (JSON contains)
- Should filter by tags (JSON contains)
- Should search by title/description
- Should sort by allowed fields (validate sortBy whitelist)
- Should return correct pagination metadata

#### 4.4.5 Find One (2 tests)

- Should return project by ID
- Should increment view count

#### 4.4.6 Update Project (3 tests)

- Should update project successfully
- Should validate ownership (createdBy matches userId)
- Should throw error if not owner

#### 4.4.7 Delete Project (3 tests)

- Should delete project successfully
- Should validate ownership
- Should throw error if assigned to a team

#### 4.4.8 Publish Project (4 tests)

- Should transition draft → published
- Should validate ownership
- Should throw error if not approved
- Should set publishedAt timestamp

#### 4.4.9 Approve Project (3 tests)

- Should transition pending → approved
- Should set approvedBy and approvedAt
- Should throw error if project not found

#### 4.4.10 Assign Team (4 tests)

- Should assign team to project successfully
- Should throw error if project not found
- Should throw error if project already assigned
- Should update status to 'in_progress'

#### 4.4.11 Get My Projects (4 tests)

- Should return projects for current client
- Should fetch clientId from clients table
- Should throw error if user not a client
- Should return paginated results

#### 4.4.12 Integration Tests (2 tests)

- Should require JWT authentication for mutations
- Should enforce role restrictions (client/supervisor/university)

**Special Testing Notes:**

- Mock client lookup query in `create()` and `getMyProjects()`
- Test JSON operators: `sql` template for `requiredSkills` and `tags` filtering
- Test `findOne()` view count increment separately from `findById()`
- Validate `sortBy` field whitelist in `findAll()`
- **DO NOT test studentProjectFeed** - this belongs in student domain module

---

## 5. Mock Patterns & Best Practices

### 5.1 Drizzle Query Mocking Pattern

```typescript
// Pattern for SELECT queries
mockDb.db.select = jest.fn().mockImplementation(() => ({
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  limit: jest.fn().mockResolvedValue([mockData]),
}));

// Pattern for INSERT queries
mockDb.db.insert = jest.fn().mockReturnValue({
  values: jest.fn().mockReturnThis(),
  returning: jest.fn().mockResolvedValue([mockData]),
});

// Pattern for UPDATE queries
mockDb.db.update = jest.fn().mockReturnValue({
  set: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  returning: jest.fn().mockResolvedValue([mockData]),
});

// Pattern for DELETE queries
mockDb.db.delete = jest.fn().mockReturnValue({
  where: jest.fn().mockResolvedValue(undefined),
});

// Pattern for COUNT queries
mockDb.db.select = jest.fn().mockImplementation(() => ({
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockResolvedValue([{ count: 42 }]),
}));
```

### 5.2 Multiple Query Mocking (Sequential)

```typescript
// When service makes multiple SELECT queries in sequence
let selectCallCount = 0;
mockDb.db.select = jest.fn().mockImplementation(() => {
  selectCallCount++;

  const chain = {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn(),
  };

  if (selectCallCount === 1) {
    // First query: project lookup
    chain.limit.mockResolvedValue([mockProject]);
  } else if (selectCallCount === 2) {
    // Second query: existing bookmark check
    chain.limit.mockResolvedValue([]);
  } else if (selectCallCount === 3) {
    // Third query: count query (NO limit)
    chain.where.mockResolvedValue([{ count: 5 }]);
  }

  return chain;
});
```

### 5.3 Context Mocking Pattern

```typescript
// Default context (happy path)
mockContext.getContext.mockReturnValue({
  userId: 'user-123',
  universityId: 'univ-456',
  studentId: 'student-123', // For student-specific modules
});

// Test missing universityId
mockContext.getContext.mockReturnValue({
  userId: 'user-123',
  universityId: null, // ← Missing tenant context
});

// Test unauthenticated
mockContext.getUserId.mockReturnValue(null);
```

### 5.4 Notification Assertion Pattern

```typescript
expect(mockNotification.push).toHaveBeenCalledWith({
  type: NotificationType.SUCCESS,
  message: expect.stringContaining('created successfully'),
  context: { entityId: 'entity-123' },
});

// OR more specific
expect(mockNotification.push).toHaveBeenCalledWith(
  expect.objectContaining({
    type: NotificationType.SUCCESS,
    message: 'Bookmark created successfully',
  }),
);
```

---

## 6. Test Data Fixtures

### 6.1 Standard Mock Data

```typescript
// Mock User Context
const mockUserContext = {
  userId: 'user-123',
  email: 'test@example.com',
  role: 'student',
  universityId: 'univ-456',
  studentId: 'student-123',
};

// Mock Project
const mockProject = {
  id: 'proj-123',
  title: 'Test Project',
  description: 'Test description',
  clientId: 'client-123',
  universityId: 'univ-456',
  createdBy: 'user-123',
  status: 'published',
  approvalStatus: 'approved',
  isPublished: true,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

// Mock Experience
const mockExperience = {
  id: 'exp-123',
  title: 'Test Experience',
  overview: 'Test overview text that meets minimum length requirements',
  startDate: new Date('2025-06-01'),
  endDate: new Date('2025-09-01'),
  createdBy: 'user-123',
  universityId: 'univ-456',
  status: 'DRAFT',
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

// Mock Team
const mockTeam = {
  id: 'team-123',
  name: 'Test Team',
  createdBy: 'user-123',
  universityId: 'univ-456',
  status: 'ACTIVE',
  visibility: 'UNIVERSITY_ONLY',
  maxMembers: 10,
  currentMemberCount: 1,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

// Mock Bookmark
const mockBookmark = {
  id: 'bookmark-123',
  studentId: 'student-123',
  universityId: 'univ-456',
  projectId: 'proj-123',
  sharedBy: null,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};
```

---

## 7. Quality Gates & Acceptance Criteria

### 7.1 Test Suite Must Pass These Checks

- [ ] All tests use proper `describe()` and `it()` naming
- [ ] All tests have AAA structure (Arrange, Act, Assert)
- [ ] All tests mock dependencies correctly
- [ ] All tests verify multi-tenant isolation
- [ ] All tests verify ownership authorization
- [ ] All tests verify error handling
- [ ] All tests verify notification emissions
- [ ] No tests contain presentation logic validation
- [ ] No tests contain domain-specific orchestration
- [ ] Test coverage reports show 80%+ line coverage

### 7.2 Common Anti-Patterns to Avoid

❌ **Don't test implementation details:**

```typescript
// BAD: Testing internal field values
expect(result.status).toBe('DRAFT');
expect(result.isPublished).toBe(false);

// GOOD: Testing behavior
expect(result).toBeDefined();
expect(result.id).toBeTruthy();
```

❌ **Don't test presentation logic in core:**

```typescript
// BAD: Testing formatting (domain concern)
expect(result.summary).toHaveLength(150);
expect(result.tags).toContain('+3');

// GOOD: Testing data retrieval
expect(result.description).toBeDefined();
expect(result.tags).toBeDefined();
```

❌ **Don't test multiple behaviors in one test:**

```typescript
// BAD: Testing create + notification + side effects
it('should create bookmark and notify and increment count', () => {
  // Too much in one test
});

// GOOD: Separate tests
it('should create bookmark successfully', () => {});
it('should emit success notification', () => {});
```

---

## 8. Implementation Checklist

### Phase 1: Experiences Module (Highest Priority)

- [ ] Create `src/modules/core/experiences/_tests_/experiences.service.spec.ts`
- [ ] Implement 25 test cases from Section 4.2
- [ ] Verify 80%+ coverage with `pnpm test:cov`
- [ ] Verify all tests pass with `pnpm test experiences`

### Phase 2: Teams Module

- [ ] Create `src/modules/core/teams/_tests_/teams.service.spec.ts`
- [ ] Implement 25 test cases from Section 4.3
- [ ] Verify 80%+ coverage
- [ ] Verify all tests pass

### Phase 3: Projects Module (Complete)

- [ ] Update `src/modules/core/projects/_tests_/projects.service.spec.ts`
- [ ] Add 34 missing test cases from Section 4.4
- [ ] Verify 80%+ coverage
- [ ] Verify all tests pass

### Phase 4: Integration

- [ ] Run full test suite: `pnpm test`
- [ ] Verify no test failures
- [ ] Verify total coverage across all core modules is 80%+
- [ ] Update README with test documentation

---

## 9. Success Metrics

**Completion Criteria:**

- ✅ ~115 total test cases implemented across 4 modules
- ✅ All tests follow architecture spec patterns
- ✅ 100% multi-tenant isolation coverage
- ✅ 100% ownership authorization coverage
- ✅ 80%+ overall line coverage
- ✅ 0 test failures in CI/CD
- ✅ No presentation logic tests in core modules

**Timeline:**

- Experiences: 2-3 hours
- Teams: 2-3 hours
- Projects: 2-3 hours
- **Total: 6-9 hours**

---

## 10. Reference Implementation

**Use Bookmarks module as the gold standard:**

- Location: `src/modules/core/bookmarks/_tests_/bookmarks.service.spec.ts`
- Pattern: Multi-query mocking, context validation, ownership checks
- Coverage: ~30 tests covering all CRUD + business rules

**Key patterns to replicate:**

1. Context mocking with `getContext()` and `getUserId()`
2. Sequential query mocking with call counters
3. Proper error assertion with `AppError`
4. Notification verification with `expect.objectContaining()`

---

### **END OF PRD**
