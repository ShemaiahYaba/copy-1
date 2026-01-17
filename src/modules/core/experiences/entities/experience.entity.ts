// ============================================================================
// GRAPHQL ENTITIES
// src/modules/core/experiences/entities/experience.entity.ts
// ============================================================================

import { ObjectType, Field, ID, Int } from '@nestjs/graphql';

@ObjectType()
export class ExperienceLearnerRequirementEntity {
  @Field()
  label: string;

  @Field()
  value: string;
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
export class ExperienceEntity {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  createdBy: string;

  @Field(() => ID)
  universityId: string;

  @Field()
  title: string;

  @Field({ nullable: true })
  courseCode?: string;

  @Field()
  overview: string;

  @Field()
  startDate: Date;

  @Field()
  endDate: Date;

  @Field(() => Int, { nullable: true })
  durationWeeks?: number;

  @Field(() => [ExperienceLearnerRequirementEntity], { nullable: true })
  learnerRequirements?: ExperienceLearnerRequirementEntity[];

  @Field(() => ExperienceCompanyPreferencesEntity, { nullable: true })
  companyPreferences?: ExperienceCompanyPreferencesEntity;

  @Field(() => [String], { nullable: true })
  prerequisites?: string[];

  @Field(() => [String], { nullable: true })
  expectedOutcomes?: string[];

  @Field(() => [String], { nullable: true })
  projectExamples?: string[];

  @Field(() => ExperienceContactEntity, { nullable: true })
  mainContact?: ExperienceContactEntity;

  @Field()
  status: string;

  @Field(() => [String], { nullable: true })
  tags?: string[];

  @Field(() => Int)
  totalStudents: number;

  @Field(() => Int)
  matchesCount: number;

  @Field({ nullable: true })
  publishedAt?: Date;

  @Field({ nullable: true })
  archivedAt?: Date;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

@ObjectType()
export class PaginatedExperiencesResponse {
  @Field(() => [ExperienceEntity])
  items: ExperienceEntity[];

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

@ObjectType()
export class ExperienceParticipantEntity {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  experienceId: string;

  @Field(() => ID)
  userId: string;

  @Field()
  role: string;

  @Field()
  status: string;

  @Field()
  createdAt: Date;
}
