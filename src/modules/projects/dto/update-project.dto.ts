// ============================================================================
// src/modules/projects/dto/update-project.dto.ts
// ============================================================================

import { InputType, Field, PartialType } from '@nestjs/graphql';
import { CreateProjectDto } from './create-project.dto';
import { IsOptional, IsEnum, IsUUID } from 'class-validator';

@InputType()
export class UpdateProjectDto extends PartialType(CreateProjectDto) {
  @Field({ nullable: true })
  @IsOptional()
  @IsEnum(['draft', 'published', 'in_progress', 'completed', 'cancelled'])
  status?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  assignedTeamId?: string;
}
