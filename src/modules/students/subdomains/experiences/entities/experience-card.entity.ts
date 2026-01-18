// ============================================================================
// STUDENT EXPERIENCE ENTITIES
// src/modules/students/subdomains/experiences/entities/experience-card.entity.ts
// ============================================================================

import { ObjectType, Field, ID, Int } from '@nestjs/graphql';

// ============================================================================
// EXPERIENCE CARD (Grid View)
// ============================================================================

@ObjectType()
export class ExperienceCardEntity {
  @Field(() => ID)
  id: string;

  @Field()
  title: string;

  @Field({ nullable: true })
  courseCode?: string;

  @Field()
  university: string;

  @Field()
  summary: string;

  @Field(() => [String])
  skills: string[];

  @Field()
  status: string;

  @Field()
  startDate: string; // ISO8601

  @Field()
  endDate: string; // ISO8601

  @Field(() => Int)
  matchesCount: number;

  @Field(() => [String])
  tags: string[];
}

// ============================================================================
// EXPERIENCE ROW (List View)
// ============================================================================

@ObjectType()
export class ExperienceRowEntity {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  status: string;

  @Field()
  createdBy: string;

  @Field()
  createdAt: string; // ISO8601

  @Field({ nullable: true })
  endDate?: string; // ISO8601

  @Field()
  matchesUrl: string; // `/experiences/${id}/matches`
}

// ============================================================================
// EXPERIENCE DETAIL (Full View)
// ============================================================================

@ObjectType()
export class ExperienceDurationEntity {
  @Field()
  start: string; // ISO8601

  @Field()
  end: string; // ISO8601

  @Field(() => Int)
  weeks: number;
}

@ObjectType()
export class ExperienceLearnerEntity {
  @Field()
  label: string;

  @Field()
  value: string;
}

@ObjectType()
export class ExperienceRequirementsEntity {
  @Field(() => ExperienceCompanyPreferencesEntity, { nullable: true })
  companyPreferences?: ExperienceCompanyPreferencesEntity;

  @Field(() => [String], { nullable: true })
  prerequisites?: string[];
}

@ObjectType()
export class ExperienceCompanyPreferencesEntity {
  @Field({ nullable: true })
  location?: string;

  @Field(() => [String], { nullable: true })
  industry?: string[];
}

@ObjectType()
export class ExperienceContactEntity {
  @Field()
  name: string;

  @Field()
  role: string;

  @Field()
  email: string;

  @Field()
  institution: string;

  @Field()
  location: string;
}

@ObjectType()
export class ExperienceMemberEntity {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  userId: string;

  @Field()
  name: string;

  @Field()
  email: string;

  @Field()
  role: string;

  @Field()
  status: string;

  @Field()
  joinedAt: string;
}

@ObjectType()
export class ExperienceInstitutionEntity {
  @Field()
  name: string;

  @Field()
  department: string;

  @Field()
  location: string;

  @Field()
  description: string;
}

@ObjectType()
export class RecommendedProjectCardEntity {
  @Field(() => ID)
  id: string;

  @Field()
  title: string;

  @Field()
  organization: string;

  @Field({ nullable: true })
  summary?: string;

  @Field(() => [String])
  skills: string[];

  @Field()
  difficulty: string;
}

@ObjectType()
export class ExperienceDetailEntity {
  @Field(() => ID)
  id: string;

  @Field()
  title: string;

  @Field({ nullable: true })
  courseCode?: string;

  @Field(() => ExperienceDurationEntity)
  duration: ExperienceDurationEntity;

  @Field(() => [String])
  tags: string[];

  @Field()
  status: string;

  @Field()
  overview: string;

  @Field(() => [ExperienceLearnerEntity])
  learners: ExperienceLearnerEntity[];

  @Field(() => ExperienceRequirementsEntity)
  requirements: ExperienceRequirementsEntity;

  @Field(() => [String])
  expectedOutcomes: string[];

  @Field(() => [String])
  projectExamples: string[];

  @Field(() => ExperienceContactEntity)
  mainContact: ExperienceContactEntity;

  @Field(() => [ExperienceMemberEntity])
  members: ExperienceMemberEntity[];

  @Field(() => [RecommendedProjectCardEntity])
  recommendedProjects: RecommendedProjectCardEntity[];

  @Field(() => ExperienceInstitutionEntity)
  institution: ExperienceInstitutionEntity;
}

// ============================================================================
// PAGINATED RESPONSE
// ============================================================================

@ObjectType()
export class PaginatedExperiencesResponse {
  @Field(() => [ExperienceCardEntity], { nullable: true })
  cards?: ExperienceCardEntity[];

  @Field(() => [ExperienceRowEntity], { nullable: true })
  rows?: ExperienceRowEntity[];

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  limit: number;

  @Field(() => Int)
  totalPages: number;

  @Field()
  hasNextPage: boolean;

  @Field()
  hasPreviousPage: boolean;
}
