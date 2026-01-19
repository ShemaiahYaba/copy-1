// ============================================================================
// STUDENT DASHBOARD FILTERS DTO
// src/modules/students/subdomains/dashboard/dto/dashboard-filters.dto.ts
// ============================================================================

import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, IsEnum } from 'class-validator';

@InputType()
export class DashboardFiltersDto {
  @Field({ nullable: true, defaultValue: 'ONGOING' })
  @IsOptional()
  @IsEnum(['ALL', 'ONGOING', 'COMPLETED'])
  taskStatus?: string = 'ONGOING';

  @Field({ nullable: true, defaultValue: 'ONGOING' })
  @IsOptional()
  @IsEnum(['ALL', 'ONGOING', 'COMPLETED', 'DRAFT'])
  projectStatus?: string = 'ONGOING';

  @Field({ nullable: true, defaultValue: 'PUBLISHED' })
  @IsOptional()
  @IsEnum(['ALL', 'DRAFT', 'PUBLISHED', 'ARCHIVED'])
  experienceStatus?: string = 'PUBLISHED';
}
