import { InputType, Field, ID } from '@nestjs/graphql';
import {
  IsUUID,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { TeamRole } from '../models/team-assignment.model';

@InputType()
export class AddMemberDto {
  @Field(() => ID)
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @Field({ nullable: true, defaultValue: 'MEMBER' })
  @IsOptional()
  @IsEnum(['LEAD', 'MEMBER', 'OBSERVER'])
  role?: TeamRole;

  @Field({ nullable: true, defaultValue: false })
  @IsBoolean()
  @IsOptional()
  canInviteMembers?: boolean;

  @Field({ nullable: true, defaultValue: false })
  @IsBoolean()
  @IsOptional()
  canEditTeam?: boolean;

  @Field({ nullable: true, defaultValue: false })
  @IsBoolean()
  @IsOptional()
  canMessageClient?: boolean;
}
