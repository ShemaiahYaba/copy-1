import { InputType, PartialType, Field } from '@nestjs/graphql';
import { CreateExperienceDto } from './create-experience.dto';
import { IsOptional, IsEnum } from 'class-validator';
import { ExperienceStatus } from '../models/experience.model';

@InputType()
export class UpdateExperienceDto extends PartialType(CreateExperienceDto) {
  @Field({ nullable: true })
  @IsOptional()
  @IsEnum(['DRAFT', 'PUBLISHED', 'ARCHIVED'])
  status?: ExperienceStatus;
}
