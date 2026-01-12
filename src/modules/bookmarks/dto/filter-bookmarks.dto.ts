// ============================================================================
// src/modules/bookmarks/dto/filter-bookmarks.dto.ts
// ============================================================================

import { InputType, Field, Int } from '@nestjs/graphql';
import { IsOptional, IsString, IsEnum, IsInt, Min, Max } from 'class-validator';

export enum BookmarkFilter {
  CREATED = 'CREATED', // Created by student
  SHARED = 'SHARED', // Shared with student
  ALL = 'ALL', // All bookmarks
}

@InputType()
export class FilterBookmarksDto {
  // Pagination
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

  // Filter type
  @Field(() => String, { nullable: true, defaultValue: BookmarkFilter.ALL })
  @IsEnum(BookmarkFilter)
  @IsOptional()
  filter?: BookmarkFilter = BookmarkFilter.ALL;

  // Search
  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  search?: string; // Search in project title or organization

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
