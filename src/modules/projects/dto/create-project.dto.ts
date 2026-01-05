// ============================================================================
// PART 3: DTOs
// src/modules/projects/dto/create-project.dto.ts
// ============================================================================

import { InputType, Field, Int } from '@nestjs/graphql';
import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  Max,
  IsEnum,
  MinLength,
  MaxLength,
  IsDate,
} from 'class-validator';
import { Type } from 'class-transformer';

@InputType()
export class CreateProjectDto {
  @Field()
  @IsString()
  @IsNotEmpty()
  @MinLength(10, { message: 'Title must be at least 10 characters' })
  @MaxLength(255, { message: 'Title must not exceed 255 characters' })
  title: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MinLength(50, { message: 'Description must be at least 50 characters' })
  description: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  objectives?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  deliverables?: string;

  @Field(() => [String])
  @IsArray()
  @IsNotEmpty({ message: 'At least one required skill must be specified' })
  requiredSkills: string[];

  @Field(() => [String], { nullable: true })
  @IsArray()
  @IsOptional()
  preferredSkills?: string[];

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  experienceLevel?: string;

  @Field(() => Int)
  @IsInt()
  @Min(1, { message: 'Duration must be at least 1 week' })
  @Max(52, { message: 'Duration cannot exceed 52 weeks' })
  duration: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date;

  @Field({ nullable: true })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  deadline?: Date;

  @Field({ nullable: true })
  @IsBoolean()
  @IsOptional()
  isFlexibleTimeline?: boolean;

  @Field(() => Int, { nullable: true })
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(20, { message: 'Team size cannot exceed 20' })
  teamSize?: number;

  @Field(() => Int, { nullable: true })
  @IsInt()
  @IsOptional()
  @Min(1)
  maxApplicants?: number;

  @Field()
  @IsString()
  @IsNotEmpty()
  @IsEnum(
    [
      'web_development',
      'mobile_development',
      'data_science',
      'machine_learning',
      'design',
      'marketing',
      'research',
      'consulting',
      'other',
    ],
    { message: 'Invalid category' },
  )
  category: string;

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
  @IsString()
  @IsOptional()
  location?: string;

  @Field(() => Int, { nullable: true })
  @IsInt()
  @IsOptional()
  @Min(0)
  budget?: number;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  compensationType?: string;
}
