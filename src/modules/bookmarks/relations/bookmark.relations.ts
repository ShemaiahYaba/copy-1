// ============================================================================
// src/modules/bookmarks/relations/bookmark.relations.ts
// ============================================================================

import { relations } from 'drizzle-orm';
import { bookmarks } from '../models/bookmark.model';
import { users } from '@modules/core/auth/models/user.model';
import { projects } from '@modules/projects/models/project.model';

export const bookmarkRelations = relations(bookmarks, ({ one }) => ({
  // Student who owns this bookmark
  student: one(users, {
    fields: [bookmarks.studentId],
    references: [users.id],
    relationName: 'studentBookmarks',
  }),

  // The bookmarked project
  project: one(projects, {
    fields: [bookmarks.projectId],
    references: [projects.id],
    relationName: 'projectBookmarks',
  }),

  // User who shared this bookmark (if applicable)
  sharer: one(users, {
    fields: [bookmarks.sharedBy],
    references: [users.id],
    relationName: 'sharedBookmarks',
  }),
}));
