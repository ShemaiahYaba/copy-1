// ============================================================================
// EXPERIENCE PARTICIPANTS TABLE MODEL
// src/modules/core/experiences/models/experience-participant.model.ts
// ============================================================================

import { pgTable, uuid, varchar, timestamp, index } from 'drizzle-orm/pg-core';
import { users, universities } from '@modules/core/auth/models/user.model';
import { experiences } from './experience.model';

export const experienceParticipants = pgTable(
  'experience_participants',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    experienceId: uuid('experience_id')
      .references(() => experiences.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    universityId: uuid('university_id')
      .references(() => universities.id, { onDelete: 'cascade' })
      .notNull(),

    role: varchar('role', { length: 50 }).default('STUDENT').notNull(),
    status: varchar('status', { length: 50 }).default('ACTIVE').notNull(),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    experienceIdx: index('participants_experience_idx').on(table.experienceId),
    userIdx: index('participants_user_idx').on(table.userId),
    universityIdx: index('participants_university_idx').on(table.universityId),
  }),
);

export type ExperienceParticipant = typeof experienceParticipants.$inferSelect;
export type NewExperienceParticipant =
  typeof experienceParticipants.$inferInsert;
