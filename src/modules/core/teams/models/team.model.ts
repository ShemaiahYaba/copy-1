// ============================================================================
// TEAMS TABLE MODEL
// src/modules/core/teams/models/team.model.ts
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
import { users, universities } from '@modules/core/auth/models/user.model';
import { projects } from '@modules/core/projects/models/project.model';

// ============================================================================
// ENUMS
// ============================================================================

export const teamStatusEnum = pgEnum('team_status', [
  'ACTIVE',
  'INACTIVE',
  'COMPLETED',
  'DISBANDED',
]);

export const teamVisibilityEnum = pgEnum('team_visibility', [
  'PUBLIC',
  'PRIVATE',
  'UNIVERSITY_ONLY',
]);

// ============================================================================
// TEAMS TABLE
// ============================================================================

export const teams = pgTable(
  'teams',
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
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    avatar: varchar('avatar', { length: 500 }),

    // Project Assignment
    projectId: uuid('project_id').references(() => projects.id, {
      onDelete: 'set null',
    }),
    assignedAt: timestamp('assigned_at'),

    // Supervision
    supervisorId: uuid('supervisor_id').references(() => users.id, {
      onDelete: 'set null',
    }),

    // Team Lead (usually a student)
    leadId: uuid('lead_id').references(() => users.id, {
      onDelete: 'set null',
    }),

    // Status & Settings
    status: teamStatusEnum('status').default('ACTIVE').notNull(),
    visibility: teamVisibilityEnum('visibility')
      .default('UNIVERSITY_ONLY')
      .notNull(),

    // Capacity
    maxMembers: integer('max_members').default(10).notNull(),
    currentMemberCount: integer('current_member_count').default(0).notNull(),

    // Messaging
    hasUnreadMessages: boolean('has_unread_messages').default(false),
    lastMessageAt: timestamp('last_message_at'),

    // Metadata
    tags: json('tags').$type<string[]>(),
    skills: json('skills').$type<string[]>(),

    // Timestamps
    completedAt: timestamp('completed_at'),
    disbandedAt: timestamp('disbanded_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    createdByIdx: index('teams_created_by_idx').on(table.createdBy),
    universityIdx: index('teams_university_idx').on(table.universityId),
    projectIdx: index('teams_project_idx').on(table.projectId),
    supervisorIdx: index('teams_supervisor_idx').on(table.supervisorId),
    leadIdx: index('teams_lead_idx').on(table.leadId),
    statusIdx: index('teams_status_idx').on(table.status),
    createdAtIdx: index('teams_created_at_idx').on(table.createdAt),
  }),
);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
export type TeamStatus = 'ACTIVE' | 'INACTIVE' | 'COMPLETED' | 'DISBANDED';
export type TeamVisibility = 'PUBLIC' | 'PRIVATE' | 'UNIVERSITY_ONLY';
