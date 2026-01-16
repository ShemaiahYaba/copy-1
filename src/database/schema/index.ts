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

export { bookmarks } from '@modules/core/bookmarks/models/bookmark.model';
export { projects } from '@modules/core/projects/models/project.model';

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

export type {
  Bookmark,
  NewBookmark,
} from '@modules/core/bookmarks/models/bookmark.model';

export type {
  Project,
  NewProject,
  ProjectStatus,
  ProjectApprovalStatus,
  ProjectCategory,
} from '@modules/core/projects/models/project.model';
