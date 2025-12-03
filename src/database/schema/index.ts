// ============================================================================
// src/database/schema/index.ts (UPDATE THIS FILE)
// ============================================================================

// Import auth models
export {
  users,
  clients,
  supervisors,
  students,
  universities,
  userRoleEnum,
  employmentStatusEnum,
  graduationStatusEnum,
} from '@modules/core/auth/models/user.model';

// Export types for use elsewhere
export type {
  User,
  NewUser,
  Client,
  NewClient,
  Supervisor,
  NewSupervisor,
  Student,
  NewStudent,
  University,
  NewUniversity,
  UserRole,
  EmploymentStatus,
  GraduationStatus,
} from '@modules/core/auth/models/user.model';
