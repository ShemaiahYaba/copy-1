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

export { bookmarks } from '@modules/students/subdomains/bookmarks/models/bookmark.model';
export {
  projects,
  projectStatusEnum,
  projectApprovalStatusEnum,
  projectCategoryEnum,
  projectDifficultyEnum,
  projectVisibilityEnum,
} from '@modules/core/projects/models/project.model';
export {
  experiences,
  experienceStatusEnum,
} from '@modules/core/experiences/models/experience.model';
export { experienceParticipants } from '@modules/core/experiences/models/experience-participant.model';
export {
  teams,
  teamStatusEnum,
  teamVisibilityEnum,
} from '@modules/core/teams/models/team.model';
export {
  teamAssignments,
  teamRoleEnum,
  assignmentStatusEnum,
} from '@modules/core/teams/models/team-assignment.model';

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
} from '@modules/students/subdomains/bookmarks/models/bookmark.model';

export type {
  Project,
  NewProject,
  ProjectStatus,
  ProjectApprovalStatus,
  ProjectCategory,
} from '@modules/core/projects/models/project.model';

export type {
  Experience,
  NewExperience,
  ExperienceStatus,
} from '@modules/core/experiences/models/experience.model';
export type {
  ExperienceParticipant,
  NewExperienceParticipant,
} from '@modules/core/experiences/models/experience-participant.model';
export type {
  Team,
  NewTeam,
  TeamStatus,
  TeamVisibility,
} from '@modules/core/teams/models/team.model';
export type {
  TeamAssignment,
  NewTeamAssignment,
  TeamRole,
  AssignmentStatus,
} from '@modules/core/teams/models/team-assignment.model';
