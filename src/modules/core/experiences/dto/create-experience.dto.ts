// ============================================================================
// CREATE EXPERIENCE DTO
// src/modules/core/experiences/dto/create-experience.dto.ts
// ============================================================================

import { InputType, Field, Int } from '@nestjs/graphql';
import {
  IsString,
  IsNotEmpty,
  IsDate,
  IsOptional,
  IsArray,
  ValidateNested,
  MinLength,
  MaxLength,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

@InputType()
export class ExperienceLearnerRequirementInput {
  @Field()
  @IsString()
  label: string;

  @Field()
  @IsString()
  value: string;
}

@InputType()
export class ExperienceCompanyPreferencesInput {
  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  location?: string;

  @Field(() => [String], { nullable: true })
  @IsArray()
  @IsOptional()
  industry?: string[];
}

@InputType()
export class ExperienceContactInput {
  @Field()
  @IsString()
  name: string;

  @Field()
  @IsString()
  role: string;

  @Field()
  @IsString()
  email: string;

  @Field()
  @IsString()
  institution: string;

  @Field()
  @IsString()
  location: string;
}

@InputType()
export class CreateExperienceDto {
  @Field()
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(255)
  title: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  courseCode?: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MinLength(50)
  overview: string;

  @Field()
  @IsDate()
  @Type(() => Date)
  startDate: Date;

  @Field()
  @IsDate()
  @Type(() => Date)
  endDate: Date;

  @Field(() => Int, { nullable: true })
  @IsInt()
  @IsOptional()
  @Min(1)
  durationWeeks?: number;

  @Field(() => [ExperienceLearnerRequirementInput], { nullable: true })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ExperienceLearnerRequirementInput)
  learnerRequirements?: ExperienceLearnerRequirementInput[];

  @Field(() => ExperienceCompanyPreferencesInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => ExperienceCompanyPreferencesInput)
  companyPreferences?: ExperienceCompanyPreferencesInput;

  @Field(() => [String], { nullable: true })
  @IsArray()
  @IsOptional()
  prerequisites?: string[];

  @Field(() => [String], { nullable: true })
  @IsArray()
  @IsOptional()
  expectedOutcomes?: string[];

  @Field(() => [String], { nullable: true })
  @IsArray()
  @IsOptional()
  projectExamples?: string[];

  @Field(() => ExperienceContactInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => ExperienceContactInput)
  mainContact?: ExperienceContactInput;

  @Field(() => [String], { nullable: true })
  @IsArray()
  @IsOptional()
  tags?: string[];
}
