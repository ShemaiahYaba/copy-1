# 🔴 Critical Issues

## 1. **You're Breaking the Core + Domain Architecture**

Your bookmarks module is built as a **CORE module** when it should be a **DOMAIN module** (student-specific).

**Current (Wrong):**

```markdown
src/modules/bookmarks/ ← Core module location
├── bookmarks.service.ts ← Mixing core CRUD with student logic
├── bookmarks.resolver.ts ← Student-only resolver in core location
```

**Should be:**

```markdown
src/modules/students/
└── subdomains/
└── bookmarks/
├── bookmarks.service.ts ← Student-specific orchestration
└── bookmarks.resolver.ts ← Student GraphQL endpoint
```

**Why this matters:**

- Bookmarks are **student-specific** - only students bookmark projects
- Your current structure violates the "Core = shared, Domain = role-specific" principle
- This will cause problems when supervisors need bookmark features (they'll have different rules)

### 2. **Missing Core Projects Service Integration**

Your `BookmarksService` directly queries the `projects` table instead of injecting `ProjectsService`:

```typescript
// ❌ WRONG: Direct database access in bookmarks.service.ts
const [project] = await this.db.db
  .select()
  .from(projects)
  .where(eq(projects.id, dto.projectId))
  .limit(1);
```

**Should be:**

```typescript
// ✅ CORRECT: Inject and use ProjectsService
constructor(
  private readonly projectsService: ProjectsService,  // ← Inject core service
  private readonly contextService: ContextService,
  private readonly notificationService: NotificationService,
) {}

// Then use:
const project = await this.projectsService.findOne(dto.projectId);
```

### 3. **Missing Multi-Tenancy Filter in Bookmarks**

Your bookmarks table doesn't enforce `universityId` filtering! This is a **severe security issue**.

**Current schema (Missing tenant isolation):**

```typescript
// bookmarks.model.ts - NO universityId!
export const bookmarks = pgTable('bookmarks', {
  studentId: uuid('student_id').references(() => users.id),
  projectId: uuid('project_id').references(() => projects.id),
  // ❌ Missing: universityId for tenant isolation
});
```

**Should have:**

```typescript
export const bookmarks = pgTable('bookmarks', {
  studentId: uuid('student_id').references(() => users.id),
  projectId: uuid('project_id').references(() => projects.id),
  universityId: uuid('university_id') // ← CRITICAL: Add this
    .references(() => universities.id, { onDelete: 'cascade' })
    .notNull(),
});
```

And every query needs:

```typescript
const { universityId } = this.contextService.getContext();
// Filter by both studentId AND universityId
```

---

## ⚠️ Major Issues

### 4. **Projects Module Lacks Core CRUD Methods**

Your `ProjectsService` has student feed logic but is **missing basic CRUD** that bookmarks needs:

**Missing from ProjectsService:**

```typescript
// These should exist in ProjectsService (Core):
async findById(id: string): Promise<Project> {
  const { universityId } = this.contextService.getContext();
  // Tenant-validated lookup
}

async findByIds(ids: string[]): Promise<Project[]> {
  // Batch query for bookmarks enrichment
}
```

Currently you have `findOne()` which increments view count - this is wrong for bookmarks validation!

### 5. **Bookmarks Service Has Too Many Responsibilities**

Your `BookmarksService` is doing:

- ✅ Bookmark CRUD (correct)
- ❌ Project enrichment (should delegate to ProjectsService)
- ❌ Match score calculation (should inject ProjectMatchService)
- ❌ Difficulty mapping (should come from ProjectsService)

**Example of overreach:**

```typescript
// ❌ BookmarksService shouldn't know about project difficulty
private mapDifficulty(category: string): string {
  const difficultyMap = { /* ... */ };
  return difficultyMap[category] || 'INTERMEDIATE';
}
```

This should be:

```typescript
// ✅ ProjectsService knows project metadata
async enrichProjectCard(project: Project): Promise<ProjectCardEntity> {
  return {
    difficulty: project.difficulty || this.inferDifficulty(project.category),
    // ...
  };
}
```

---

## 📋 High-Impact Next Steps (Priority Order)

### **Step 1: Fix Multi-Tenancy (URGENT - Security Risk)**

1. **Add `universityId` to bookmarks table:**

   ```bash
   # Create migration
   pnpm drizzle-kit generate
   ```

2. **Update bookmarks.model.ts:**

   ```typescript
   universityId: uuid('university_id')
     .references(() => universities.id, { onDelete: 'cascade' })
     .notNull(),
   ```

3. **Update all queries to filter by universityId:**

   ```typescript
   const { studentId, universityId } = this.contextService.getContext();

   await this.db.db
     .select()
     .from(bookmarks)
     .where(
       and(
         eq(bookmarks.studentId, studentId),
         eq(bookmarks.universityId, universityId), // ← Add everywhere
       ),
     );
   ```

### **Step 2: Restructure to Core + Domain Pattern**

1. **Keep bookmarks as a lightweight core module** (just the table):

   ```markdown
   src/modules/bookmarks/
   ├── models/bookmark.model.ts
   └── README.md
   ```

2. **Create student bookmark subdomain:**

   ```bash
   mkdir -p src/modules/students/subdomains/bookmarks
   ```

3. **Move service + resolver:**

   ```markdown
   src/modules/students/subdomains/bookmarks/
   ├── bookmarks.module.ts
   ├── bookmarks.service.ts # ← Move here
   ├── bookmarks.resolver.ts # ← Move here
   ├── entities/
   └── dto/
   ```

4. **Update imports in service:**

   ```typescript
   // students/subdomains/bookmarks/bookmarks.service.ts
   @Injectable()
   export class StudentBookmarksService {
     constructor(
       private readonly db: DatabaseService,
       private readonly projectsService: ProjectsService, // ← Inject core
       private readonly contextService: ContextService,
     ) {}
   }
   ```

### **Step 3: Add Missing Core Methods to ProjectsService**

```typescript
// projects/projects.service.ts

/**
 * Find project by ID with tenant validation.
 * Does NOT increment view count (use findOne for that).
 */
async findById(id: string): Promise<Project> {
  const { universityId } = this.contextService.getContext();

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

/**
 * Batch fetch projects by IDs (for bookmark enrichment).
 */
async findByIds(ids: string[]): Promise<Project[]> {
  const { universityId } = this.contextService.getContext();

  return this.db.db
    .select()
    .from(projects)
    .where(
      and(
        inArray(projects.id, ids),
        eq(projects.universityId, universityId)
      )
    );
}

/**
 * Enrich project to card format (shared logic).
 */
async toCard(project: Project): Promise<ProjectCardEntity> {
  return this.mapProjectToCard(project);  // Reuse existing method
}
```

### **Step 4: Simplify BookmarksService** (Now StudentBookmarksService)

```typescript
// students/subdomains/bookmarks/bookmarks.service.ts

async findAll(filters: FilterBookmarksDto) {
  const { studentId, universityId } = this.contextService.getContext();

  // Step 1: Get bookmarks (just IDs)
  const bookmarkRecords = await this.db.db
    .select()
    .from(bookmarks)
    .where(
      and(
        eq(bookmarks.studentId, studentId),
        eq(bookmarks.universityId, universityId)
      )
    );

  // Step 2: Get project IDs
  const projectIds = bookmarkRecords.map(b => b.projectId);

  // Step 3: Fetch projects (via ProjectsService - handles tenant filtering)
  const projects = await this.projectsService.findByIds(projectIds);

  // Step 4: Enrich to cards (delegate to ProjectsService)
  const cards = await Promise.all(
    projects.map(p => this.projectsService.toCard(p))
  );

  return { cards, total: cards.length, /* ... */ };
}
```

### **Step 5: Update App Module**

```typescript
// app.module.ts
@Module({
  imports: [
    // Core modules
    ProjectsModule,
    BookmarksModule, // ← Just the table/model

    // Domain modules
    StudentsModule, // ← Contains students/subdomains/bookmarks
  ],
})
export class AppModule {}
```

---

## 🎯 Quick Win Checklist

Before building more features, verify:

- [ ] **Multi-tenancy**: Every query filters by `universityId`
- [ ] **Architecture**: Core modules export services, Domain modules inject them
- [ ] **Service delegation**: Domain services NEVER access repositories directly
- [ ] **Context usage**: All services use `ContextService.getContext()`
- [ ] **Testing**: Multi-tenant test cases exist

---

## 💡 What You Did Right

1. ✅ **Excellent GraphQL schema design** - clean DTOs, proper validation
2. ✅ **Comprehensive test coverage** - unit tests follow spec
3. ✅ **Notification integration** - proper event emissions
4. ✅ **Error handling** - using AppError with proper codes
5. ✅ **Documentation** - README exists (though needs updating)

---

## 🚀 Recommended Immediate Action

**Tonight:**

1. Add `universityId` to bookmarks table (30 min)
2. Update all bookmark queries to filter by university (45 min)
3. Add `findById` + `findByIds` to ProjectsService (30 min)

**Tomorrow:** 4. Restructure bookmarks to student subdomain (1-2 hours) 5. Refactor BookmarksService to inject ProjectsService (1 hour)

**After that, you're ready to build:**

- Student Dashboard (confidently, following the same pattern)
- Student Experiences
- Student Project Feed (already partially done!)

You're 80% there - just need to lock in the architecture patterns! 🔥
