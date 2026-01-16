// ============================================================================
// Student Project Feed DTOs
// src/modules/projects/dto/student-feed.dto.ts
// ============================================================================

import { InputType, Field, Int } from '@nestjs/graphql';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

@InputType()
export class CursorPaginationInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  cursor?: string;

  @Field(() => Int, { nullable: true, defaultValue: 9 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 9;
}

export const projectFeedSortOptions = [
  'MATCH_SCORE',
  'NEWEST_FIRST',
  'OLDEST_FIRST',
  'DEADLINE_SOON',
] as const;

export type ProjectFeedSort = (typeof projectFeedSortOptions)[number];

@InputType()
export class ProjectFeedFilterInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  search?: string;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  categories?: string[];

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  skills?: string[];

  @Field({ nullable: true, defaultValue: 'MATCH_SCORE' })
  @IsOptional()
  @IsEnum(projectFeedSortOptions)
  sort?: ProjectFeedSort;
}
