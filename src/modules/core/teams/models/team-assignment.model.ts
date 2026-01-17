// ============================================================================
// TEAM ASSIGNMENTS TABLE MODEL
// src/modules/core/teams/models/team-assignment.model.ts
// ============================================================================

import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  boolean,
  pgEnum,
  index,
  unique,
} from 'drizzle-orm/pg-core';
import { users, universities } from '@modules/core/auth/models/user.model';
import { teams } from './team.model';

// ============================================================================
// ENUMS
// ============================================================================

export const teamRoleEnum = pgEnum('team_role', ['LEAD', 'MEMBER', 'OBSERVER']);

export const assignmentStatusEnum = pgEnum('assignment_status', [
  'ACTIVE',
  'INACTIVE',
  'REMOVED',
  'LEFT',
]);

// ============================================================================
// TEAM ASSIGNMENTS TABLE (Many-to-Many: Teams <-> Users)
// ============================================================================

export const teamAssignments = pgTable(
  'team_assignments',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Relations
    teamId: uuid('team_id')
      .references(() => teams.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    universityId: uuid('university_id')
      .references(() => universities.id, { onDelete: 'cascade' })
      .notNull(),

    // Role & Status
    role: teamRoleEnum('role').default('MEMBER').notNull(),
    status: assignmentStatusEnum('status').default('ACTIVE').notNull(),

    // Permissions
    canInviteMembers: boolean('can_invite_members').default(false),
    canEditTeam: boolean('can_edit_team').default(false),
    canMessageClient: boolean('can_message_client').default(false),

    // Metadata
    invitedBy: uuid('invited_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    joinedAt: timestamp('joined_at').defaultNow().notNull(),
    leftAt: timestamp('left_at'),
    removedBy: uuid('removed_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    removedAt: timestamp('removed_at'),
    removalReason: varchar('removal_reason', { length: 500 }),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    teamIdx: index('assignments_team_idx').on(table.teamId),
    userIdx: index('assignments_user_idx').on(table.userId),
    universityIdx: index('assignments_university_idx').on(table.universityId),
    statusIdx: index('assignments_status_idx').on(table.status),
    uniqueTeamUser: unique('assignments_team_user_unique').on(
      table.teamId,
      table.userId,
    ),
  }),
);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type TeamAssignment = typeof teamAssignments.$inferSelect;
export type NewTeamAssignment = typeof teamAssignments.$inferInsert;
export type TeamRole = 'LEAD' | 'MEMBER' | 'OBSERVER';
export type AssignmentStatus = 'ACTIVE' | 'INACTIVE' | 'REMOVED' | 'LEFT';
