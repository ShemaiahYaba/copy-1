// ============================================================================
// GRAPHQL ENTITIES
// src/modules/core/teams/entities/team.entity.ts
// ============================================================================

import { ObjectType, Field, ID, Int } from '@nestjs/graphql';

@ObjectType()
export class TeamMemberEntity {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  userId: string;

  @Field()
  role: string;

  @Field()
  status: string;

  @Field()
  canInviteMembers: boolean;

  @Field()
  canEditTeam: boolean;

  @Field()
  canMessageClient: boolean;

  @Field()
  joinedAt: Date;

  @Field({ nullable: true })
  leftAt?: Date;
}

@ObjectType()
export class TeamEntity {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  createdBy: string;

  @Field(() => ID)
  universityId: string;

  @Field()
  name: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  avatar?: string;

  @Field(() => ID, { nullable: true })
  projectId?: string;

  @Field({ nullable: true })
  assignedAt?: Date;

  @Field(() => ID, { nullable: true })
  supervisorId?: string;

  @Field(() => ID, { nullable: true })
  leadId?: string;

  @Field()
  status: string;

  @Field()
  visibility: string;

  @Field(() => Int)
  maxMembers: number;

  @Field(() => Int)
  currentMemberCount: number;

  @Field()
  hasUnreadMessages: boolean;

  @Field({ nullable: true })
  lastMessageAt?: Date;

  @Field(() => [String], { nullable: true })
  tags?: string[];

  @Field(() => [String], { nullable: true })
  skills?: string[];

  @Field({ nullable: true })
  completedAt?: Date;

  @Field({ nullable: true })
  disbandedAt?: Date;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

@ObjectType()
export class TeamWithMembersEntity extends TeamEntity {
  @Field(() => [TeamMemberEntity])
  members: TeamMemberEntity[];
}

@ObjectType()
export class PaginatedTeamsResponse {
  @Field(() => [TeamEntity])
  items: TeamEntity[];

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  limit: number;

  @Field(() => Int)
  totalPages: number;

  @Field()
  hasNextPage: boolean;

  @Field()
  hasPreviousPage: boolean;
}

@ObjectType()
export class TeamAssignmentEntity {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  teamId: string;

  @Field(() => ID)
  userId: string;

  @Field()
  role: string;

  @Field()
  status: string;

  @Field()
  canInviteMembers: boolean;

  @Field()
  canEditTeam: boolean;

  @Field()
  canMessageClient: boolean;

  @Field()
  joinedAt: Date;

  @Field({ nullable: true })
  leftAt?: Date;

  @Field()
  createdAt: Date;
}
