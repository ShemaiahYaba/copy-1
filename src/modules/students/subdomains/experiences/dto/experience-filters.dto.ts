// ============================================================================
// STUDENT EXPERIENCE FILTERS DTO
// src/modules/students/subdomains/experiences/dto/experience-filters.dto.ts
// ============================================================================

import { InputType, Field, Int } from '@nestjs/graphql';
import { IsOptional, IsString, IsEnum, IsInt, Min, Max } from 'class-validator';

export type ExperienceViewType = 'GRID' | 'LIST';
export type ExperienceFilterType = 'CREATED' | 'SHARED' | 'ALL';

@InputType()
export class StudentExperienceFiltersDto {
  @Field(() => Int, { nullable: true, defaultValue: 1 })
  @IsInt()
  @IsOptional()
  @Min(1)
  page?: number = 1;

  @Field(() => Int, { nullable: true, defaultValue: 10 })
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(50)
  limit?: number = 10;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  search?: string;

  @Field({ nullable: true, defaultValue: 'CREATED' })
  @IsOptional()
  @IsEnum(['CREATED', 'SHARED', 'ALL'])
  filter?: ExperienceFilterType = 'CREATED';

  @Field({ nullable: true, defaultValue: 'GRID' })
  @IsOptional()
  @IsEnum(['GRID', 'LIST'])
  view?: ExperienceViewType = 'GRID';

  @Field({ nullable: true })
  @IsOptional()
  @IsEnum(['DRAFT', 'PUBLISHED', 'ARCHIVED'])
  status?: string;

  @Field({ nullable: true, defaultValue: 'createdAt' })
  @IsString()
  @IsOptional()
  sortBy?: string = 'createdAt';

  @Field({ nullable: true, defaultValue: 'desc' })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
