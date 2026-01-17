import { InputType, PartialType, Field } from '@nestjs/graphql';
import { CreateTeamDto } from './create-team.dto';
import { IsOptional, IsEnum } from 'class-validator';
import type { TeamStatus, TeamVisibility } from '../models/team.model';

@InputType()
export class UpdateTeamDto extends PartialType(CreateTeamDto) {
  @Field({ nullable: true })
  @IsOptional()
  @IsEnum(['ACTIVE', 'INACTIVE', 'COMPLETED', 'DISBANDED'])
  status?: TeamStatus;

  @Field({ nullable: true })
  @IsOptional()
  @IsEnum(['PUBLIC', 'PRIVATE', 'UNIVERSITY_ONLY'])
  visibility?: TeamVisibility;
}
