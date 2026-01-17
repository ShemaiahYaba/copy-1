// ============================================================================
// PART 1: DATABASE MODEL
// src/modules/bookmarks/models/bookmark.model.ts
// ============================================================================

import { pgTable, uuid, timestamp, index, unique } from 'drizzle-orm/pg-core';
import { users, universities } from '@modules/core/auth/models/user.model';
import { projects } from '@modules/core/projects/models/project.model';

// ============================================================================
// BOOKMARKS TABLE
// ============================================================================

export const bookmarks = pgTable(
  'bookmarks',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Student who saved the bookmark
    studentId: uuid('student_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),

    universityId: uuid('university_id')
      .references(() => universities.id, { onDelete: 'cascade' })
      .notNull(),

    // Project being bookmarked
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),

    // If this bookmark was shared by a supervisor/mentor
    sharedBy: uuid('shared_by').references(() => users.id, {
      onDelete: 'set null',
    }),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    // Indexes for performance
    studentIdx: index('bookmarks_student_idx').on(table.studentId),
    universityIdx: index('bookmarks_university_idx').on(table.universityId),
    projectIdx: index('bookmarks_project_idx').on(table.projectId),
    sharedByIdx: index('bookmarks_shared_by_idx').on(table.sharedBy),
    createdAtIdx: index('bookmarks_created_at_idx').on(table.createdAt),

    // Unique constraint: One bookmark per student per project
    uniqueStudentProject: unique('bookmarks_student_project_unique').on(
      table.studentId,
      table.projectId,
    ),
  }),
);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type Bookmark = typeof bookmarks.$inferSelect;
export type NewBookmark = typeof bookmarks.$inferInsert;
