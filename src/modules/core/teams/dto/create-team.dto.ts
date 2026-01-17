// ============================================================================
// CREATE TEAM DTO
// src/modules/core/teams/dto/create-team.dto.ts
// ============================================================================

import { InputType, Field, Int, ID } from '@nestjs/graphql';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsInt,
  Min,
  Max,
  MinLength,
  MaxLength,
  IsEnum,
  IsUUID,
} from 'class-validator';
import { TeamVisibility } from '../models/team.model';

@InputType()
export class CreateTeamDto {
  @Field()
  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'Team name must be at least 3 characters' })
  @MaxLength(255, { message: 'Team name must not exceed 255 characters' })
  name: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  avatar?: string;

  @Field(() => ID, { nullable: true })
  @IsUUID()
  @IsOptional()
  projectId?: string;

  @Field(() => ID, { nullable: true })
  @IsUUID()
  @IsOptional()
  supervisorId?: string;

  @Field(() => ID, { nullable: true })
  @IsUUID()
  @IsOptional()
  leadId?: string;

  @Field({ nullable: true, defaultValue: 'UNIVERSITY_ONLY' })
  @IsOptional()
  @IsEnum(['PUBLIC', 'PRIVATE', 'UNIVERSITY_ONLY'])
  visibility?: TeamVisibility;

  @Field(() => Int, { nullable: true, defaultValue: 10 })
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(50)
  maxMembers?: number;

  @Field(() => [String], { nullable: true })
  @IsArray()
  @IsOptional()
  tags?: string[];

  @Field(() => [String], { nullable: true })
  @IsArray()
  @IsOptional()
  skills?: string[];
}
