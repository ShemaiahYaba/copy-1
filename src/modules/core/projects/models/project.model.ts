// ============================================================================
// PART 1: DATABASE MODEL
// src/modules/projects/models/project.model.ts
// ============================================================================

import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  pgEnum,
  index,
  json,
} from 'drizzle-orm/pg-core';
import { users, clients, universities } from '@modules/core/auth/models/user.model';

// ============================================================================
// ENUMS
// ============================================================================

export const projectStatusEnum = pgEnum('project_status', [
  'draft',
  'published',
  'in_progress',
  'completed',
  'cancelled',
]);

export const projectApprovalStatusEnum = pgEnum('project_approval_status', [
  'pending',
  'approved',
  'rejected',
]);

export const projectCategoryEnum = pgEnum('project_category', [
  'web_development',
  'mobile_development',
  'data_science',
  'machine_learning',
  'design',
  'marketing',
  'research',
  'consulting',
  'other',
]);

export const projectDifficultyEnum = pgEnum('project_difficulty', [
  'ROOKIE',
  'INTERMEDIATE',
  'ADVANCED',
]);

export const projectVisibilityEnum = pgEnum('project_visibility', [
  'PUBLIC',
  'UNIVERSITY_RESTRICTED',
]);

// ============================================================================
// PROJECTS TABLE
// ============================================================================

export const projects = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Ownership
    clientId: uuid('client_id')
      .references(() => clients.id, { onDelete: 'cascade' })
      .notNull(),
    universityId: uuid('university_id')
      .references(() => universities.id, { onDelete: 'cascade' })
      .notNull(),
    createdBy: uuid('created_by')
      .references(() => users.id)
      .notNull(),

    // Basic Information
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description').notNull(),
    organization: varchar('organization', { length: 255 }),
    organizationLogoUrl: varchar('organization_logo_url', { length: 500 }),
    difficulty: projectDifficultyEnum('difficulty').default('ROOKIE'),
    objectives: text('objectives'), // What the project aims to achieve
    deliverables: text('deliverables'), // Expected outputs

    // Skills & Requirements
    requiredSkills: json('required_skills').$type<string[]>().notNull(), // ["JavaScript", "React", "Node.js"]
    preferredSkills: json('preferred_skills').$type<string[]>(), // Nice-to-have skills
    experienceLevel: varchar('experience_level', { length: 50 }), // "Beginner", "Intermediate", "Advanced"
    learnerRequirements: json('learner_requirements').$type<
      { label: string; level: string }[]
    >(),
    expectedOutcomes: json('expected_outcomes').$type<string[]>(),
    additionalResources: json('additional_resources').$type<string[]>(),
    contactPersons:
      json('contact_persons').$type<
        { name: string; role?: string; email?: string }[]
      >(),

    // Timeline
    duration: integer('duration').notNull(), // Duration in weeks
    startDate: timestamp('start_date'),
    deadline: timestamp('deadline'),
    isFlexibleTimeline: boolean('is_flexible_timeline').default(false),

    // Capacity
    teamSize: integer('team_size').default(1).notNull(), // How many students needed
    maxApplicants: integer('max_applicants').default(10), // Max applications accepted

    // Status & Approval
    status: projectStatusEnum('status').default('draft').notNull(),
    approvalStatus: projectApprovalStatusEnum('approval_status')
      .default('pending')
      .notNull(),
    approvedBy: uuid('approved_by').references(() => users.id), // Supervisor/University who approved
    approvedAt: timestamp('approved_at'),

    // Categorization
    category: projectCategoryEnum('category').notNull(),
    tags: json('tags').$type<string[]>(), // Additional tags for filtering
    industry: varchar('industry', { length: 100 }), // "Healthcare", "Finance", etc.

    // Assignment (populated when assigned to a team)
    assignedTeamId: uuid('assigned_team_id'), // Will reference teams table
    assignedAt: timestamp('assigned_at'),

    // Visibility & Settings
    isPublished: boolean('is_published').default(false).notNull(),
    isRemote: boolean('is_remote').default(false),
    location: varchar('location', { length: 255 }), // If not remote
    budget: integer('budget'), // Optional budget in local currency
    compensationType: varchar('compensation_type', { length: 50 }), // "Paid", "Unpaid", "Academic Credit"
    visibility: projectVisibilityEnum('visibility').default('PUBLIC'),
    confidential: boolean('confidential').default(false),

    // Metadata
    viewCount: integer('view_count').default(0),
    applicationCount: integer('application_count').default(0),
    bookmarkCount: integer('bookmark_count').default(0),

    // Timestamps
    publishedAt: timestamp('published_at'),
    completedAt: timestamp('completed_at'),
    cancelledAt: timestamp('cancelled_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    clientIdx: index('projects_client_idx').on(table.clientId),
    universityIdx: index('projects_university_idx').on(table.universityId),
    statusIdx: index('projects_status_idx').on(table.status),
    categoryIdx: index('projects_category_idx').on(table.category),
    publishedIdx: index('projects_published_idx').on(table.isPublished),
    assignedTeamIdx: index('projects_assigned_team_idx').on(
      table.assignedTeamId,
    ),
    createdAtIdx: index('projects_created_at_idx').on(table.createdAt),
  }),
);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

export type ProjectStatus =
  | 'draft'
  | 'published'
  | 'in_progress'
  | 'completed'
  | 'cancelled';
export type ProjectApprovalStatus = 'pending' | 'approved' | 'rejected';
export type ProjectCategory =
  | 'web_development'
  | 'mobile_development'
  | 'data_science'
  | 'machine_learning'
  | 'design'
  | 'marketing'
  | 'research'
  | 'consulting'
  | 'other';
export type ProjectDifficulty = 'ROOKIE' | 'INTERMEDIATE' | 'ADVANCED';
export type ProjectVisibility = 'PUBLIC' | 'UNIVERSITY_RESTRICTED';
