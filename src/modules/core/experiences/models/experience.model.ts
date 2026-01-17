// ============================================================================
// EXPERIENCES TABLE MODEL
// src/modules/core/experiences/models/experience.model.ts
// ============================================================================

import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  pgEnum,
  index,
  json,
} from 'drizzle-orm/pg-core';
import { users, universities } from '@modules/core/auth/models/user.model';

// ============================================================================
// ENUMS
// ============================================================================

export const experienceStatusEnum = pgEnum('experience_status', [
  'DRAFT',
  'PUBLISHED',
  'ARCHIVED',
]);

// ============================================================================
// EXPERIENCES TABLE
// ============================================================================

export const experiences = pgTable(
  'experiences',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Ownership & Context
    createdBy: uuid('created_by')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    universityId: uuid('university_id')
      .references(() => universities.id, { onDelete: 'cascade' })
      .notNull(),

    // Basic Information
    title: varchar('title', { length: 255 }).notNull(),
    courseCode: varchar('course_code', { length: 50 }),
    overview: text('overview').notNull(),

    // Duration
    startDate: timestamp('start_date').notNull(),
    endDate: timestamp('end_date').notNull(),
    durationWeeks: integer('duration_weeks'),

    // Requirements & Outcomes
    learnerRequirements: json('learner_requirements').$type<
      { label: string; value: string }[]
    >(),
    companyPreferences: json('company_preferences').$type<{
      location?: string;
      industry?: string[];
    }>(),
    prerequisites: json('prerequisites').$type<string[]>(),
    expectedOutcomes: json('expected_outcomes').$type<string[]>(),
    projectExamples: json('project_examples').$type<string[]>(),

    // Contact Information
    mainContact: json('main_contact').$type<{
      name: string;
      role: string;
      email: string;
      institution: string;
      location: string;
    }>(),

    // Status & Visibility
    status: experienceStatusEnum('status').default('DRAFT').notNull(),

    // Metadata
    tags: json('tags').$type<string[]>(),
    totalStudents: integer('total_students').default(0),
    matchesCount: integer('matches_count').default(0),

    // Timestamps
    publishedAt: timestamp('published_at'),
    archivedAt: timestamp('archived_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    createdByIdx: index('experiences_created_by_idx').on(table.createdBy),
    universityIdx: index('experiences_university_idx').on(table.universityId),
    statusIdx: index('experiences_status_idx').on(table.status),
    createdAtIdx: index('experiences_created_at_idx').on(table.createdAt),
  }),
);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type Experience = typeof experiences.$inferSelect;
export type NewExperience = typeof experiences.$inferInsert;
export type ExperienceStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
