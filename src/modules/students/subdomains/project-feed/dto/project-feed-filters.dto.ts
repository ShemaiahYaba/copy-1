// ============================================================================
// PROJECT FEED FILTERS DTO
// src/modules/students/subdomains/project-feed/dto/project-feed-filters.dto.ts
// ============================================================================

import { InputType, Field, Int } from '@nestjs/graphql';
import {
  IsOptional,
  IsString,
  IsArray,
  IsEnum,
  IsInt,
  Min,
  Max,
} from 'class-validator';

export type ProjectFeedSortOption =
  | 'NEWEST'
  | 'OLDEST'
  | 'MATCH_SCORE'
  | 'DEADLINE_SOON';

@InputType()
export class ProjectFeedFiltersDto {
  @Field(() => Int, { nullable: true, defaultValue: 1 })
  @IsInt()
  @IsOptional()
  @Min(1)
  page?: number = 1;

  @Field(() => Int, { nullable: true, defaultValue: 9 })
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(50)
  limit?: number = 9;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  search?: string;

  @Field(() => [String], { nullable: true })
  @IsArray()
  @IsOptional()
  categories?: string[];

  @Field({ nullable: true, defaultValue: 'MATCH_SCORE' })
  @IsOptional()
  @IsEnum(['NEWEST', 'OLDEST', 'MATCH_SCORE', 'DEADLINE_SOON'])
  sort?: ProjectFeedSortOption = 'MATCH_SCORE';

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  cursor?: string; // For pagination
}
