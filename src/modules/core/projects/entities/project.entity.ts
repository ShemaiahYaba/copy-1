// ============================================================================
// PART 2: GRAPHQL ENTITIES
// src/modules/projects/entities/project.entity.ts
// ============================================================================

import { ObjectType, Field, ID, Int } from '@nestjs/graphql';

@ObjectType()
export class ProjectEntity {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  clientId: string;

  @Field(() => ID)
  createdBy: string;

  @Field()
  title: string;

  @Field()
  description: string;

  @Field({ nullable: true })
  organization?: string;

  @Field({ nullable: true })
  organizationLogoUrl?: string;

  @Field({ nullable: true })
  objectives?: string;

  @Field({ nullable: true })
  deliverables?: string;

  @Field(() => [String])
  requiredSkills: string[];

  @Field(() => [String], { nullable: true })
  preferredSkills?: string[];

  @Field({ nullable: true })
  experienceLevel?: string;

  @Field({ nullable: true })
  difficulty?: string;

  @Field(() => [ProjectLearnerRequirementEntity], { nullable: true })
  learnerRequirements?: ProjectLearnerRequirementEntity[];

  @Field(() => [String], { nullable: true })
  expectedOutcomes?: string[];

  @Field(() => [String], { nullable: true })
  additionalResources?: string[];

  @Field(() => [ProjectContactEntity], { nullable: true })
  contactPersons?: ProjectContactEntity[];

  @Field(() => Int)
  duration: number;

  @Field({ nullable: true })
  startDate?: Date;

  @Field({ nullable: true })
  deadline?: Date;

  @Field()
  isFlexibleTimeline: boolean;

  @Field(() => Int)
  teamSize: number;

  @Field(() => Int, { nullable: true })
  maxApplicants?: number;

  @Field()
  status: string;

  @Field()
  approvalStatus: string;

  @Field(() => ID, { nullable: true })
  approvedBy?: string;

  @Field({ nullable: true })
  approvedAt?: Date;

  @Field()
  category: string;

  @Field(() => [String], { nullable: true })
  tags?: string[];

  @Field({ nullable: true })
  industry?: string;

  @Field(() => ID, { nullable: true })
  assignedTeamId?: string;

  @Field({ nullable: true })
  assignedAt?: Date;

  @Field()
  isPublished: boolean;

  @Field()
  isRemote: boolean;

  @Field({ nullable: true })
  location?: string;

  @Field(() => Int, { nullable: true })
  budget?: number;

  @Field({ nullable: true })
  compensationType?: string;

  @Field({ nullable: true })
  visibility?: string;

  @Field({ nullable: true })
  confidential?: boolean;

  @Field(() => Int)
  viewCount: number;

  @Field(() => Int)
  applicationCount: number;

  @Field(() => Int)
  bookmarkCount: number;

  @Field({ nullable: true })
  publishedAt?: Date;

  @Field({ nullable: true })
  completedAt?: Date;

  @Field({ nullable: true })
  cancelledAt?: Date;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

@ObjectType()
export class PaginatedProjectsResponse {
  @Field(() => [ProjectEntity])
  items: ProjectEntity[];

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
export class ProjectLearnerRequirementEntity {
  @Field()
  label: string;

  @Field()
  level: string;
}

@ObjectType()
export class ProjectContactEntity {
  @Field()
  name: string;

  @Field({ nullable: true })
  role?: string;

  @Field({ nullable: true })
  email?: string;
}

