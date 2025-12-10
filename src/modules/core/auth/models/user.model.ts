// src/modules/auth/models/user.model.ts
import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  boolean,
  pgEnum,
  index,
  json,
} from 'drizzle-orm/pg-core';

// ============================================================================
// ENUMS
// ============================================================================

export const userRoleEnum = pgEnum('user_role', [
  'client',
  'supervisor',
  'student',
  'university',
]);

export const employmentStatusEnum = pgEnum('employment_status', [
  'employed',
  'resigned',
]);

export const graduationStatusEnum = pgEnum('graduation_status', [
  'active',
  'graduated',
  'deferred',
]);

// ============================================================================
// USERS TABLE (Supabase Auth Integration)
// ============================================================================

export const users = pgTable(
  'users',
  {
    // ✅ This ID comes from Supabase auth.users.id (UUID)
    id: uuid('id').primaryKey(), // No defaultRandom() - Supabase provides this
    email: varchar('email', { length: 255 }).notNull().unique(),
    name: varchar('name', { length: 255 }),
    role: userRoleEnum('role').notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    emailVerified: boolean('email_verified').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    emailIdx: index('users_email_idx').on(table.email),
    roleIdx: index('users_role_idx').on(table.role),
  }),
);

// ============================================================================
// CLIENTS TABLE
// ============================================================================

export const clients = pgTable(
  'clients',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id') // ✅ UUID to match users.id
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull()
      .unique(),
    organizationName: varchar('organization_name', { length: 255 }).notNull(),
    industry: varchar('industry', { length: 100 }),
    orgDocumentUrl: varchar('org_document_url', { length: 500 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('clients_user_idx').on(table.userId),
  }),
);

// ============================================================================
// UNIVERSITIES TABLE
// ============================================================================

export const universities = pgTable(
  'universities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id') // ✅ UUID to match users.id
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull()
      .unique(),
    name: varchar('name', { length: 255 }).notNull(),
    location: varchar('location', { length: 255 }),
    verificationDocumentUrl: varchar('verification_document_url', {
      length: 500,
    }),
    isVerified: boolean('is_verified').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('universities_user_idx').on(table.userId),
    nameIdx: index('universities_name_idx').on(table.name),
  }),
);

// ============================================================================
// SUPERVISORS TABLE
// ============================================================================

export const supervisors = pgTable(
  'supervisors',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id') // ✅ FIXED: Changed from text to uuid
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull()
      .unique(),
    universityId: uuid('university_id')
      .references(() => universities.id)
      .notNull(),
    employmentStatus: employmentStatusEnum('employment_status')
      .default('employed')
      .notNull(),
    employmentDocumentUrl: varchar('employment_document_url', { length: 500 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('supervisors_user_idx').on(table.userId),
    universityIdx: index('supervisors_university_idx').on(table.universityId),
  }),
);

// ============================================================================
// STUDENTS TABLE
// ============================================================================

export const students = pgTable(
  'students',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id') // ✅ FIXED: Changed from text to uuid
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull()
      .unique(),
    matricNumber: varchar('matric_number', { length: 50 }).notNull().unique(),
    graduationStatus: graduationStatusEnum('graduation_status')
      .default('active')
      .notNull(),
    supervisorId: uuid('supervisor_id').references(() => supervisors.id),
    skills: json('skills').$type<string[]>(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('students_user_idx').on(table.userId),
    matricIdx: index('students_matric_idx').on(table.matricNumber),
    supervisorIdx: index('students_supervisor_idx').on(table.supervisorId),
  }),
);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;

export type Supervisor = typeof supervisors.$inferSelect;
export type NewSupervisor = typeof supervisors.$inferInsert;

export type Student = typeof students.$inferSelect;
export type NewStudent = typeof students.$inferInsert;

export type University = typeof universities.$inferSelect;
export type NewUniversity = typeof universities.$inferInsert;

export type UserRole = 'client' | 'supervisor' | 'student' | 'university';
export type EmploymentStatus = 'employed' | 'resigned';
export type GraduationStatus = 'active' | 'graduated' | 'deferred';
