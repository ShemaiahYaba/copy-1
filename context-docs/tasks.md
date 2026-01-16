# 10 Explicit Next Tasks (Execution Order)

## Task 1: Add universityId to bookmarks table schema

**File:** `src/modules/bookmarks/models/bookmark.model.ts`

**Action:**

```typescript
// FIND this line (around line 18):
studentId: uuid('student_id')
  .references(() => users.id, { onDelete: 'cascade' })
  .notNull(),

// ADD this immediately after:
universityId: uuid('university_id')
  .references(() => universities.id, { onDelete: 'cascade' })
  .notNull(),

// UPDATE the indexes section at bottom (around line 39):
// ADD this new index:
universityIdx: index('bookmarks_university_idx').on(table.universityId),
```

**Verify:** File should now have `universityId` field and index.

---

## Task 2: Generate and run migration for bookmarks table

**Terminal commands (run in order):**

```bash
# Step 1: Generate migration
pnpm drizzle-kit generate

# Step 2: Review the generated SQL file
# It should be in src/database/migrations/
# Look for ALTER TABLE bookmarks ADD COLUMN university_id

# Step 3: Run migration
pnpm drizzle-kit migrate

# Step 4: Verify migration applied
# Check your database that bookmarks table now has university_id column
```

**Verify:** Run `SELECT * FROM bookmarks LIMIT 1;` in your DB - should see `university_id` column.

---

## Task 3: Update ContextService.getContext() to include universityId

**File:** `src/modules/shared/context/context.service.ts`

**Action:** Find the `getContext()` method and verify it returns an object that includes `universityId`. If it doesn't, add it:

```typescript
// FIND the getContext method (should look like this):
getContext(): ContextData {
  return {
    userId: this.get('userId'),
    email: this.get('email'),
    role: this.get('role'),
    studentId: this.get('studentId'),
    supervisorId: this.get('supervisorId'),
    organizationId: this.get('organizationId'),
    universityId: this.get('universityId'), // ← ENSURE this line exists
    correlationId: this.get('correlationId'),
    path: this.get('path'),
    method: this.get('method'),
    timestamp: this.get('timestamp'),
  };
}
```

**Verify:** TypeScript should not show errors. If `ContextData` type doesn't include `universityId`, update the interface/type definition too.

---

## Task 4: Update BookmarksService.create() to use universityId

**File:** `src/modules/bookmarks/bookmarks.service.ts`

**Action:** Find the `create()` method (around line 40) and modify:

```typescript
// FIND this line (around line 40):
async create(dto: CreateBookmarkDto) {
  const studentId = this.contextService.getUserId();

  // REPLACE with:
  const { studentId, universityId } = this.contextService.getContext();

  if (!studentId) {
    throw new AppError(
      ERROR_CODES.UNAUTHORIZED,
      'User must be authenticated',
    );
  }

  // ADD this check:
  if (!universityId) {
    throw new AppError(
      ERROR_CODES.MISSING_CONTEXT,
      'University context required',
    );
  }

  // FIND the insert statement (around line 89):
  const [bookmark] = await this.db.db
    .insert(bookmarks)
    .values({
      studentId,
      projectId: dto.projectId,
      sharedBy: dto.sharedBy || null,
      universityId,  // ← ADD this line
    })
    .returning();
```

**Verify:** Method should now extract both `studentId` and `universityId` from context and insert `universityId` into the database.

---

## Task 5: Update BookmarksService.findAll() to filter by universityId

**File:** `src/modules/bookmarks/bookmarks.service.ts`

**Action:** Find the `findAll()` method (around line 120) and modify:

```typescript
// FIND this line (around line 126):
async findAll(filters: FilterBookmarksDto): Promise<{...}> {
  const studentId = this.contextService.getUserId();

  // REPLACE with:
  const { studentId, universityId } = this.contextService.getContext();

  if (!studentId) {
    throw new AppError(
      ERROR_CODES.UNAUTHORIZED,
      'User must be authenticated',
    );
  }

  // ADD this check:
  if (!universityId) {
    throw new AppError(
      ERROR_CODES.MISSING_CONTEXT,
      'University context required',
    );
  }

  // FIND the conditions array (around line 145):
  const conditions = [eq(bookmarks.studentId, studentId)];

  // REPLACE with:
  const conditions = [
    eq(bookmarks.studentId, studentId),
    eq(bookmarks.universityId, universityId),  // ← ADD this line
  ];
```

**Verify:** All bookmark queries now filter by both `studentId` AND `universityId`.

---

## Task 6: Update ALL remaining BookmarksService methods to filter by universityId

**File:** `src/modules/bookmarks/bookmarks.service.ts`

**Action:** Update these methods (in order):

### 6a. Update `findOne()` method (around line 270)

```typescript
// FIND:
const studentId = this.contextService.getUserId();

// REPLACE with:
const { studentId, universityId } = this.contextService.getContext();

// FIND the query:
const [bookmark] = await this.db.db
  .select()
  .from(bookmarks)
  .where(eq(bookmarks.id, id))
  .limit(1);

// REPLACE where clause with:
.where(
  and(
    eq(bookmarks.id, id),
    eq(bookmarks.universityId, universityId)
  )
)
```

### 6b. Update `remove()` method (around line 295)

```typescript
// FIND:
const studentId = this.contextService.getUserId();

// REPLACE with:
const { studentId, universityId } = this.contextService.getContext();

// FIND the query:
const [bookmark] = await this.db.db
  .select()
  .from(bookmarks)
  .where(eq(bookmarks.id, id))
  .limit(1);

// REPLACE where clause with:
.where(
  and(
    eq(bookmarks.id, id),
    eq(bookmarks.universityId, universityId)
  )
)
```

### 6c. Update `removeByProjectId()` method (around line 340)

```typescript
// FIND:
const studentId = this.contextService.getUserId();

// REPLACE with:
const { studentId, universityId } = this.contextService.getContext();

// FIND the query:
.where(
  and(
    eq(bookmarks.studentId, studentId),
    eq(bookmarks.projectId, projectId),
  ),
)

// REPLACE with:
.where(
  and(
    eq(bookmarks.studentId, studentId),
    eq(bookmarks.projectId, projectId),
    eq(bookmarks.universityId, universityId),  // ← ADD this line
  ),
)
```

### 6d. Update `bulkDelete()` method (around line 372)

```typescript
// FIND:
const studentId = this.contextService.getUserId();

// REPLACE with:
const { studentId, universityId } = this.contextService.getContext();

// FIND both queries in this method:
.where(
  and(
    eq(bookmarks.studentId, studentId),
    inArray(bookmarks.id, dto.bookmarkIds),
  ),
)

// REPLACE with (do this for BOTH occurrences):
.where(
  and(
    eq(bookmarks.studentId, studentId),
    eq(bookmarks.universityId, universityId),  // ← ADD this line
    inArray(bookmarks.id, dto.bookmarkIds),
  ),
)
```

### 6e. Update `search()` method (around line 410)

```typescript
// FIND:
const studentId = this.contextService.getUserId();

// REPLACE with:
const { studentId, universityId } = this.contextService.getContext();

// FIND the query:
.where(
  and(
    eq(bookmarks.studentId, studentId),
    or(
      ilike(projects.title, `%${term}%`),
      ilike(projects.description, `%${term}%`),
    ),
  ),
)

// REPLACE with:
.where(
  and(
    eq(bookmarks.studentId, studentId),
    eq(bookmarks.universityId, universityId),  // ← ADD this line
    or(
      ilike(projects.title, `%${term}%`),
      ilike(projects.description, `%${term}%`),
    ),
  ),
)
```

### 6f. Update `getCount()` method (around line 433)

```typescript
// FIND:
const studentId = this.contextService.getUserId();
if (!studentId) {
  return 0;
}

// REPLACE with:
const { studentId, universityId } = this.contextService.getContext();
if (!studentId || !universityId) {
  return 0;
}

// FIND the query:
.from(bookmarks)
.where(eq(bookmarks.studentId, studentId));

// REPLACE with:
.from(bookmarks)
.where(
  and(
    eq(bookmarks.studentId, studentId),
    eq(bookmarks.universityId, universityId)
  )
);
```

**Verify:** Search your file for `this.contextService.getUserId()` - should return 0 results. All should use `getContext()` now.

---

## Task 7: Add findById() method to ProjectsService

**File:** `src/modules/projects/projects.service.ts`

**Action:** Add this new method AFTER the `create()` method (around line 150):

```typescript
/**
 * Find project by ID with tenant validation.
 * Does NOT increment view count (use findOne for that).
 *
 * @param id - Project ID
 * @returns Project entity
 * @throws AppError if project not found or wrong university
 */
async findById(id: string): Promise<Project> {
  const { universityId } = this.contextService.getContext();

  if (!universityId) {
    throw new AppError(
      ERROR_CODES.MISSING_CONTEXT,
      'University context required',
    );
  }

  const [project] = await this.db.db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.id, id),
        eq(projects.universityId, universityId)
      )
    )
    .limit(1);

  if (!project) {
    throw new AppError(
      ERROR_CODES.RESOURCE_NOT_FOUND,
      'Project not found',
      { projectId: id, universityId }
    );
  }

  return project;
}
```

**Verify:** TypeScript compiles. Method signature should match the existing `findOne()` but without view count increment.

---

## Task 8: Add universityId to projects table (if missing)

**File:** `src/modules/projects/models/project.model.ts`

**Action:** Check if `universityId` exists in the projects table schema (around line 85):

```typescript
// SEARCH for this field:
universityId: uuid('university_id')

// IF IT DOESN'T EXIST, ADD it after clientId:
clientId: uuid('client_id')
  .references(() => clients.id, { onDelete: 'cascade' })
  .notNull(),

// ADD THIS:
universityId: uuid('university_id')
  .references(() => universities.id, { onDelete: 'cascade' })
  .notNull(),

// ALSO ADD index at bottom if missing:
universityIdx: index('projects_university_idx').on(table.universityId),
```

**If you added it:** Run migration:

```bash
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

**Verify:** Projects table has `university_id` column in database.

---

## Task 9: Update BookmarksService to use ProjectsService.findById()

**File:** `src/modules/bookmarks/bookmarks.service.ts`

**Action:**

### 9a. Add ProjectsService to constructor (around line 50)

```typescript
// FIND the constructor:
constructor(
  private readonly db: DatabaseService,
  private readonly contextService: ContextService,
  private readonly notificationService: NotificationService,
) {}

// REPLACE with:
constructor(
  private readonly db: DatabaseService,
  private readonly contextService: ContextService,
  private readonly notificationService: NotificationService,
  private readonly projectsService: ProjectsService,  // ← ADD this line
) {}
```

### 9b. Update imports at top of file

```typescript
// FIND the imports section (around line 5):
import { DatabaseService } from '@database/database.service';

// ADD this import:
import { ProjectsService } from '@modules/projects/projects.service';
```

### 9c. Update create() method to use ProjectsService (around line 55)

```typescript
// FIND this code (around line 55):
// Check if project exists
const [project] = await this.db.db
  .select()
  .from(projects)
  .where(eq(projects.id, dto.projectId))
  .limit(1);

if (!project) {
  throw new AppError(ERROR_CODES.RESOURCE_NOT_FOUND, 'Project not found', {
    projectId: dto.projectId,
  });
}

// REPLACE with:
// Check if project exists (via ProjectsService - handles tenant validation)
const project = await this.projectsService.findById(dto.projectId);
```

**Verify:** Bookmarks service now uses ProjectsService instead of direct database access for project lookups.

---

## Task 10: Update BookmarksModule to import ProjectsModule

**File:** `src/modules/bookmarks/bookmarks.module.ts`

**Action:**

### 10a. Add import statement

```typescript
// FIND the imports section (around line 5):
import { DatabaseModule } from '@database/database.module';

// ADD this import:
import { ProjectsModule } from '@modules/projects/projects.module';
```

### 10b. Add to module imports

```typescript
// FIND the @Module decorator:
@Module({
  imports: [DatabaseModule, ContextModule, NotificationModule],
  providers: [BookmarksService, BookmarksResolver],
  exports: [BookmarksService],
})

// REPLACE imports array with:
imports: [
  DatabaseModule,
  ContextModule,
  NotificationModule,
  ProjectsModule,  // ← ADD this line
],
```

**Verify:** Run `pnpm build` - should compile without errors. BookmarksService can now inject ProjectsService.

---

## Verification Checklist

After completing all 10 tasks, verify:

```bash
# 1. Build compiles
pnpm build

# 2. Tests pass
pnpm test src/modules/bookmarks

# 3. Check database schema
# Both tables should have university_id column:
# - bookmarks
# - projects

# 4. Search for anti-patterns
# Should return 0 results:
grep -r "getUserId()" src/modules/bookmarks/
grep -r "from(projects)" src/modules/bookmarks/bookmarks.service.ts
```

**Success criteria:**

- ✅ Build passes
- ✅ Tests pass
- ✅ No direct `projects` table access in BookmarksService
- ✅ All queries filter by `universityId`
- ✅ ProjectsService injected and used

**You're now ready to restructure to Core + Domain pattern!**
