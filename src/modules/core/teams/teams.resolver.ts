// ============================================================================
// TEAMS RESOLVER
// src/modules/core/teams/teams.resolver.ts
// ============================================================================

import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard } from '@modules/core/auth/guards';
import { Roles, CurrentUser } from '@modules/core/auth/decorators';
import type { User } from '@modules/core/auth/models/user.model';
import { TeamsService } from './teams.service';
import {
  TeamEntity,
  PaginatedTeamsResponse,
  TeamAssignmentEntity,
} from './entities/team.entity';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { FilterTeamsDto } from './dto/filter-teams.dto';
import { AddMemberDto } from './dto/add-member.dto';

@Resolver(() => TeamEntity)
@UseGuards(JwtAuthGuard, RolesGuard)
export class TeamsResolver {
  constructor(private readonly teamsService: TeamsService) {}

  @Mutation(() => TeamEntity)
  @Roles('student', 'supervisor', 'client', 'university')
  async createTeam(
    @Args('input') input: CreateTeamDto,
    @CurrentUser() _user: User, // eslint-disable-line @typescript-eslint/no-unused-vars
  ) {
    return this.teamsService.create(input);
  }

  @Query(() => PaginatedTeamsResponse, { name: 'teams' })
  @Roles('student', 'supervisor', 'client', 'university')
  async getTeams(
    @Args('filters') filters: FilterTeamsDto,
    @CurrentUser() _user: User, // eslint-disable-line @typescript-eslint/no-unused-vars
  ) {
    return this.teamsService.findAll(filters);
  }

  @Query(() => TeamEntity, { name: 'team' })
  @Roles('student', 'supervisor', 'client', 'university')
  async getTeam(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() _user: User, // eslint-disable-line @typescript-eslint/no-unused-vars
  ) {
    return this.teamsService.findById(id);
  }

  @Mutation(() => TeamEntity)
  @Roles('student', 'supervisor', 'client', 'university')
  async updateTeam(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateTeamDto,
    @CurrentUser() _user: User, // eslint-disable-line @typescript-eslint/no-unused-vars
  ) {
    return this.teamsService.update(id, input);
  }

  @Mutation(() => TeamAssignmentEntity)
  @Roles('student', 'supervisor', 'client', 'university')
  async addTeamMember(
    @Args('teamId', { type: () => ID }) teamId: string,
    @Args('input') input: AddMemberDto,
    @CurrentUser() _user: User, // eslint-disable-line @typescript-eslint/no-unused-vars
  ) {
    return this.teamsService.addMember(teamId, input);
  }
}
