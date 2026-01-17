// ============================================================================
// EXPERIENCES RESOLVER
// src/modules/core/experiences/experiences.resolver.ts
// ============================================================================

import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard } from '@modules/core/auth/guards';
import { Roles, CurrentUser } from '@modules/core/auth/decorators';
import type { User } from '@modules/core/auth/models/user.model';
import { ExperiencesService } from './experiences.service';
import {
  ExperienceEntity,
  PaginatedExperiencesResponse,
} from './entities/experience.entity';
import { CreateExperienceDto } from './dto/create-experience.dto';
import { UpdateExperienceDto } from './dto/update-experience.dto';
import { FilterExperiencesDto } from './dto/filter-experiences.dto';

@Resolver(() => ExperienceEntity)
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExperiencesResolver {
  constructor(private readonly experiencesService: ExperiencesService) {}

  @Mutation(() => ExperienceEntity)
  @Roles('student', 'supervisor')
  async createExperience(
    @Args('input') input: CreateExperienceDto,
    @CurrentUser() _user: User, // eslint-disable-line @typescript-eslint/no-unused-vars
  ) {
    return this.experiencesService.create(input);
  }

  @Query(() => PaginatedExperiencesResponse, { name: 'experiences' })
  @Roles('student', 'supervisor', 'client', 'university')
  async getExperiences(
    @Args('filters') filters: FilterExperiencesDto,
    @CurrentUser() _user: User, // eslint-disable-line @typescript-eslint/no-unused-vars
  ) {
    return this.experiencesService.findAll(filters);
  }

  @Query(() => ExperienceEntity, { name: 'experience' })
  @Roles('student', 'supervisor', 'client', 'university')
  async getExperience(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() _user: User, // eslint-disable-line @typescript-eslint/no-unused-vars
  ) {
    return this.experiencesService.findById(id);
  }

  @Mutation(() => ExperienceEntity)
  @Roles('student', 'supervisor')
  async updateExperience(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateExperienceDto,
    @CurrentUser() _user: User, // eslint-disable-line @typescript-eslint/no-unused-vars
  ) {
    return this.experiencesService.update(id, input);
  }

  @Mutation(() => ExperienceEntity)
  @Roles('student', 'supervisor')
  async publishExperience(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() _user: User, // eslint-disable-line @typescript-eslint/no-unused-vars
  ) {
    return this.experiencesService.publish(id);
  }

  @Mutation(() => ExperienceEntity)
  @Roles('student', 'supervisor')
  async archiveExperience(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() _user: User, // eslint-disable-line @typescript-eslint/no-unused-vars
  ) {
    return this.experiencesService.archive(id);
  }

  @Mutation(() => ExperienceEntity)
  @Roles('student', 'supervisor')
  async deleteExperience(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() _user: User, // eslint-disable-line @typescript-eslint/no-unused-vars
  ) {
    return this.experiencesService.delete(id);
  }
}
