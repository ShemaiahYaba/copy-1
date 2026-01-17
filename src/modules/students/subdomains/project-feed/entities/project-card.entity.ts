// ============================================================================
// PROJECT CARD ENTITY (Student View)
// src/modules/students/subdomains/project-feed/entities/project-card.entity.ts
// ============================================================================

import { ObjectType, Field, ID, Float, Int } from '@nestjs/graphql';

@ObjectType()
export class ProjectCardEntity {
  @Field(() => ID)
  id: string;

  @Field()
  title: string;

  @Field()
  organization: string;

  @Field({ nullable: true })
  organizationLogoUrl?: string;

  @Field()
  summary: string;

  @Field(() => [String])
  skills: string[];

  @Field()
  difficulty: string;

  @Field()
  category: string;

  @Field()
  postedAt: string; // ISO8601

  @Field(() => Float, { nullable: true })
  matchScore?: number;

  @Field({ nullable: true })
  timeRemaining?: string; // ISO8601 duration

  @Field(() => [String])
  tags: string[];

  @Field()
  status: string;
}

@ObjectType()
export class ProjectFeedFiltersMeta {
  @Field(() => [String])
  availableCategories: string[];

  @Field(() => [String])
  availableSkills: string[];

  @Field()
  defaultSort: string;
}

@ObjectType()
export class PageInfo {
  @Field()
  hasNextPage: boolean;

  @Field({ nullable: true })
  endCursor?: string;
}

@ObjectType()
export class ProjectFeedResponse {
  @Field(() => [ProjectCardEntity])
  cards: ProjectCardEntity[];

  @Field(() => ProjectFeedFiltersMeta)
  filtersMeta: ProjectFeedFiltersMeta;

  @Field(() => PageInfo)
  pageInfo: PageInfo;

  @Field(() => Int)
  total: number;
}
