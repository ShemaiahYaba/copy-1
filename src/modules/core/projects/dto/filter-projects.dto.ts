// ============================================================================
// src/modules/projects/dto/filter-projects.dto.ts
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
  IsBoolean,
} from 'class-validator';

@InputType()
export class FilterProjectsDto {
  // Pagination
  @Field(() => Int, { nullable: true, defaultValue: 1 })
  @IsInt()
  @IsOptional()
  @Min(1)
  page?: number = 1;

  @Field(() => Int, { nullable: true, defaultValue: 10 })
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  // Search
  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  search?: string; // Search in title, description

  // Filters
  @Field({ nullable: true })
  @IsOptional()
  @IsEnum(['draft', 'published', 'in_progress', 'completed', 'cancelled'])
  status?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsEnum(['pending', 'approved', 'rejected'])
  approvalStatus?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsEnum([
    'web_development',
    'mobile_development',
    'data_science',
    'machine_learning',
    'design',
    'marketing',
    'research',
    'consulting',
    'other',
  ])
  category?: string;

  @Field(() => [String], { nullable: true })
  @IsArray()
  @IsOptional()
  requiredSkills?: string[]; // Filter by skills

  @Field(() => [String], { nullable: true })
  @IsArray()
  @IsOptional()
  tags?: string[];

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  industry?: string;

  @Field({ nullable: true })
  @IsBoolean()
  @IsOptional()
  isRemote?: boolean;

  @Field({ nullable: true })
  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;

  @Field({ nullable: true })
  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean; // Not assigned to a team

  // Sorting
  @Field({ nullable: true, defaultValue: 'createdAt' })
  @IsString()
  @IsOptional()
  sortBy?: string;

  @Field({ nullable: true, defaultValue: 'desc' })
  @IsString()
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
