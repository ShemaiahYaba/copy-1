# Simple Explanation: What You're Doing Wrong & How to Fix It

## The Problem in One Sentence

**You're mixing "what students can do with bookmarks" (student-specific logic) into the bookmarks module, when it should be separated into a CORE bookmarks module (basic CRUD) and a STUDENT bookmarks subdomain (student-specific features).**

---

## Current Mistakes

### ❌ **Mistake 1: Bookmarks is in the wrong place**

**What you did:**

```
src/modules/bookmarks/  ← You put it here (wrong)
```

**What it should be:**

```
src/modules/bookmarks/               ← Core module (basic CRUD only)
src/modules/students/subdomains/bookmarks/  ← Student-specific features
```

**Why it matters:**

- Right now, only students can bookmark things
- Later, supervisors might want to bookmark projects too
- If you put student logic in the core module, you'll have to rewrite everything when supervisors need bookmarks

---

### ❌ **Mistake 2: Your BookmarksService does too much**

**What you're doing now:**

```typescript
// bookmarks.service.ts (WRONG - doing everything)
async findAll(filters) {
  // ❌ Get bookmarks from database
  // ❌ Join with projects table
  // ❌ Calculate match scores (student-specific)
  // ❌ Format skill tags (student-specific)
  // ❌ Map difficulty levels (student-specific)
  // ❌ Calculate time remaining (student-specific)
  // ❌ Fetch sharer details (student-specific)
}
```

**What it should be:**

**Core BookmarksService** (just basic CRUD):

```typescript
// modules/bookmarks/bookmarks.service.ts (CORRECT - simple CRUD)
async findAll(studentId: string) {
  const { universityId } = this.contextService.getContext();

  // ✅ ONLY: Get bookmark records from database
  return this.db.db
    .select()
    .from(bookmarks)
    .where(
      and(
        eq(bookmarks.studentId, studentId),
        eq(bookmarks.universityId, universityId)
      )
    );
}

async create(studentId: string, projectId: string) {
  // ✅ ONLY: Insert bookmark into database
  return this.db.db.insert(bookmarks).values({ studentId, projectId });
}

async delete(id: string) {
  // ✅ ONLY: Delete bookmark from database
  return this.db.db.delete(bookmarks).where(eq(bookmarks.id, id));
}
```

**Student BookmarksService** (uses core + adds student stuff):

```typescript
// modules/students/subdomains/bookmarks/bookmarks.service.ts
@Injectable()
export class StudentBookmarksService {
  constructor(
    private readonly bookmarksService: BookmarksService, // ← Inject CORE
    private readonly projectsService: ProjectsService, // ← Inject CORE
  ) {}

  async getStudentBookmarks(filters) {
    const { studentId } = this.contextService.getContext();

    // Step 1: Get bookmark IDs from CORE service
    const bookmarkRecords = await this.bookmarksService.findAll(studentId);

    // Step 2: Get project details from ProjectsService
    const projectIds = bookmarkRecords.map((b) => b.projectId);
    const projects = await this.projectsService.findByIds(projectIds);

    // Step 3: Add STUDENT-SPECIFIC stuff
    return projects.map((project) => ({
      ...project,
      matchScore: this.calculateMatchScore(project), // ← Student-specific
      difficulty: this.mapDifficulty(project), // ← Student-specific
      tags: this.formatTags(project.skills), // ← Student-specific
    }));
  }
}
```

---

### ❌ **Mistake 3: BookmarksService directly queries the projects table**

**What you're doing:**

```typescript
// bookmarks.service.ts (WRONG)
const [project] = await this.db.db
  .select()
  .from(projects) // ❌ Directly accessing projects table
  .where(eq(projects.id, dto.projectId))
  .limit(1);
```

**What you should do:**

```typescript
// bookmarks.service.ts (CORRECT)
constructor(
  private readonly projectsService: ProjectsService,  // ← Inject the service
) {}

async create(dto) {
  // ✅ Use ProjectsService instead of direct database access
  const project = await this.projectsService.findById(dto.projectId);

  if (!project) {
    throw new AppError(ERROR_CODES.RESOURCE_NOT_FOUND, 'Project not found');
  }

  // Now create the bookmark...
}
```

**Why?**

- `ProjectsService.findById()` already checks if the project exists
- It already filters by `universityId` (multi-tenancy)
- If project validation logic changes, you only update ProjectsService, not every place that checks projects

---

### ❌ **Mistake 4: Missing `universityId` in bookmarks table**

**Current schema:**

```typescript
export const bookmarks = pgTable('bookmarks', {
  id: uuid('id'),
  studentId: uuid('student_id'),
  projectId: uuid('project_id'),
  // ❌ Missing universityId!
});
```

**Correct schema:**

```typescript
export const bookmarks = pgTable('bookmarks', {
  id: uuid('id'),
  studentId: uuid('student_id'),
  projectId: uuid('project_id'),
  universityId: uuid('university_id') // ← ADD THIS
    .references(() => universities.id)
    .notNull(),
});
```

**Why?**

- Right now, a student from University A could accidentally see bookmarks from University B
- Every table needs `universityId` for security

---

## The Correct Architecture (Simple Version)

### **Core Module = "What can be done?"**

- Basic CRUD (Create, Read, Update, Delete)
- No role-specific logic
- Exports service for others to use

```typescript
// Core BookmarksService
class BookmarksService {
  create(); // ← Just insert into database
  findAll(); // ← Just get from database
  delete(); // ← Just delete from database
}
```

### **Domain Module = "How do students/supervisors/clients use it?"**

- Orchestrates multiple core services
- Adds role-specific logic
- Uses core services (never touches database directly)

```typescript
// Student BookmarksService
class StudentBookmarksService {
  constructor(
    bookmarksService, // ← Use core bookmarks
    projectsService, // ← Use core projects
  ) {}

  getStudentBookmarks() {
    // 1. Get bookmarks via BookmarksService
    // 2. Get project details via ProjectsService
    // 3. Add student-specific calculations
    // 4. Return formatted data
  }
}
```

---

## Simple Analogy

Think of it like a restaurant:

**Core Module = Kitchen**

- Makes basic dishes (CRUD operations)
- Doesn't care who orders it (students, supervisors, clients)
- Just knows how to cook

**Domain Module = Waiter**

- Takes orders from specific customers (students)
- Asks the kitchen to prepare food (calls core services)
- Presents food nicely for that customer (formats data for students)
- Different waiters for different customers (student waiter, supervisor waiter)

---

## What You Should Do Now

### **Step 1: Fix the bookmarks table**

Add `universityId` column and update all queries to filter by it. (You already have 10 tasks for this)

### **Step 2: After those 10 tasks, create the correct folder structure**

```bash
# Move bookmarks to student subdomain
mkdir -p src/modules/students/subdomains/bookmarks

# Keep core bookmarks minimal (just the table definition)
# Move service + resolver to student subdomain
```

### **Step 3: Simplify Core BookmarksService**

Remove all the enrichment logic (match scores, difficulty mapping, etc.)
Keep only basic CRUD operations

### **Step 4: Create Student BookmarksService**

Move all the student-specific logic here
Inject `BookmarksService` and `ProjectsService`

---

## Summary of Mistakes

| ❌ **Wrong**                             | ✅ **Right**                                                                                |
| ---------------------------------------- | ------------------------------------------------------------------------------------------- |
| Bookmarks in `modules/bookmarks/`        | Core in `modules/bookmarks/`, Student subdomain in `modules/students/subdomains/bookmarks/` |
| BookmarksService does everything         | Core service = CRUD only, Domain service = orchestration + enrichment                       |
| Direct database access to projects table | Inject and use `ProjectsService.findById()`                                                 |
| No `universityId` in bookmarks table     | Add `universityId` to every table                                                           |
| Service mixes CRUD and student logic     | Separate concerns: Core = data, Domain = presentation                                       |

---

**Bottom line**: Your bookmarks module should be "dumb" (just save/load bookmarks). The student subdomain should be "smart" (combine bookmarks + projects + student-specific formatting).

Does this make sense now?
