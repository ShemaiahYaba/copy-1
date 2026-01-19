// ============================================================================
// STUDENT DASHBOARD ENTITIES
// src/modules/students/subdomains/dashboard/entities/dashboard.entity.ts
// ============================================================================

import { ObjectType, Field, ID, Int } from '@nestjs/graphql';

// ============================================================================
// HEADER
// ============================================================================

@ObjectType()
export class DashboardHeaderEntity {
  @Field()
  greeting: string;

  @Field({ nullable: true })
  lastLoginAt?: string; // ISO8601

  @Field()
  hasMatches: boolean;
}

// ============================================================================
// TASKS
// ============================================================================

@ObjectType()
export class DashboardTaskEntity {
  @Field(() => ID)
  id: string;

  @Field()
  title: string;

  @Field(() => ID)
  projectId: string;

  @Field()
  projectName: string;

  @Field()
  status: string;

  @Field()
  dueAt: string; // ISO8601

  @Field()
  isOverdue: boolean;
}

// ============================================================================
// PROJECTS
// ============================================================================

@ObjectType()
export class DashboardProjectEntity {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  companyName: string;

  @Field()
  status: string;

  @Field()
  lastUpdatedAt: string; // ISO8601

  @Field({ nullable: true })
  matchScore?: number;
}

// ============================================================================
// EXPERIENCES
// ============================================================================

@ObjectType()
export class DashboardExperienceEntity {
  @Field(() => ID)
  id: string;

  @Field()
  title: string;

  @Field()
  status: string;

  @Field()
  lastEditedAt: string; // ISO8601
}

// ============================================================================
// TEAMS
// ============================================================================

@ObjectType()
export class DashboardTeamEntity {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  role: string;

  @Field(() => [String])
  avatarUrls: string[];

  @Field(() => Int)
  unreadThreadCount: number;
}

// ============================================================================
// SUGGESTIONS
// ============================================================================

@ObjectType()
export class DashboardSuggestionEntity {
  @Field(() => ID)
  projectId: string;

  @Field()
  projectName: string;

  @Field()
  reason: string;

  @Field()
  matchScore: number;

  @Field()
  actionRequired: boolean;
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

@ObjectType()
export class DashboardNotificationEntity {
  @Field(() => ID)
  id: string;

  @Field()
  type: string;

  @Field()
  message: string;

  @Field()
  createdAt: string; // ISO8601
}

@ObjectType()
export class DashboardNotificationsEntity {
  @Field(() => Int)
  unreadCount: number;

  @Field(() => [DashboardNotificationEntity])
  latest: DashboardNotificationEntity[];
}

// ============================================================================
// COUNTS
// ============================================================================

@ObjectType()
export class DashboardCountsEntity {
  @Field(() => Int)
  tasksCount: number;

  @Field(() => Int)
  projectsCount: number;

  @Field(() => Int)
  experiencesCount: number;

  @Field(() => Int)
  teamsCount: number;
}

// ============================================================================
// MAIN DASHBOARD RESPONSE
// ============================================================================

@ObjectType()
export class StudentDashboardEntity {
  @Field(() => DashboardHeaderEntity)
  header: DashboardHeaderEntity;

  @Field(() => [DashboardTaskEntity])
  tasks: DashboardTaskEntity[];

  @Field(() => [DashboardProjectEntity])
  projects: DashboardProjectEntity[];

  @Field(() => [DashboardExperienceEntity])
  experiences: DashboardExperienceEntity[];

  @Field(() => [DashboardTeamEntity])
  teams: DashboardTeamEntity[];

  @Field(() => [DashboardSuggestionEntity])
  suggestions: DashboardSuggestionEntity[];

  @Field(() => DashboardNotificationsEntity)
  notifications: DashboardNotificationsEntity;

  @Field(() => DashboardCountsEntity)
  counts: DashboardCountsEntity;
}
