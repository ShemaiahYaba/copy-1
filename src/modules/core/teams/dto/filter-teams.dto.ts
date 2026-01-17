import { InputType, Field, Int, ID } from '@nestjs/graphql';
import {
  IsOptional,
  IsString,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsUUID,
} from 'class-validator';
import { TeamStatus } from '../models/team.model';

@InputType()
export class FilterTeamsDto {
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

  @Field({ nullable: true })
  @IsOptional()
  @IsEnum(['ACTIVE', 'INACTIVE', 'COMPLETED', 'DISBANDED'])
  status?: TeamStatus;

  @Field(() => ID, { nullable: true })
  @IsUUID()
  @IsOptional()
  projectId?: string;

  @Field(() => ID, { nullable: true })
  @IsUUID()
  @IsOptional()
  supervisorId?: string;

  @Field({ nullable: true, defaultValue: 'createdAt' })
  @IsString()
  @IsOptional()
  sortBy?: string = 'createdAt';

  @Field({ nullable: true, defaultValue: 'desc' })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
