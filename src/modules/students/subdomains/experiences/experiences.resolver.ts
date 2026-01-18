// ============================================================================
// STUDENT EXPERIENCES RESOLVER
// src/modules/students/subdomains/experiences/experiences.resolver.ts
// ============================================================================

import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard } from '@modules/core/auth/guards';
import { Roles, CurrentUser } from '@modules/core/auth/decorators';
import type { User } from '@modules/core/auth/models/user.model';
import { StudentExperiencesService } from './experiences.service';
import {
  PaginatedExperiencesResponse,
  ExperienceDetailEntity,
} from './entities/experience-card.entity';
import { StudentExperienceFiltersDto } from './dto/experience-filters.dto';
import { CreateExperienceDto } from '@modules/core/experiences/dto/create-experience.dto';
import { UpdateExperienceDto } from '@modules/core/experiences/dto/update-experience.dto';

@Resolver()
@UseGuards(JwtAuthGuard, RolesGuard)
export class StudentExperiencesResolver {
  constructor(private readonly experiencesService: StudentExperiencesService) {}

  @Query(() => PaginatedExperiencesResponse, { name: 'studentExperiences' })
  @Roles('student')
  async getExperiences(
    @Args('filters', { nullable: true }) filters: StudentExperienceFiltersDto,
    @CurrentUser() _user: User, // eslint-disable-line @typescript-eslint/no-unused-vars
  ) {
    return this.experiencesService.getExperiences(filters || {});
  }

  @Query(() => ExperienceDetailEntity, { name: 'studentExperienceDetail' })
  @Roles('student')
  async getExperienceDetail(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() _user: User, // eslint-disable-line @typescript-eslint/no-unused-vars
  ) {
    return this.experiencesService.getExperienceDetail(id);
  }

  @Mutation(() => ExperienceDetailEntity, { name: 'createStudentExperience' })
  @Roles('student')
  async createExperience(
    @Args('input') input: CreateExperienceDto,
    @CurrentUser() _user: User, // eslint-disable-line @typescript-eslint/no-unused-vars
  ) {
    return this.experiencesService.createExperience(input);
  }

  @Mutation(() => ExperienceDetailEntity, { name: 'updateStudentExperience' })
  @Roles('student')
  async updateExperience(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateExperienceDto,
    @CurrentUser() _user: User, // eslint-disable-line @typescript-eslint/no-unused-vars
  ) {
    return this.experiencesService.updateExperience(id, input);
  }

  @Mutation(() => ExperienceDetailEntity, { name: 'publishStudentExperience' })
  @Roles('student')
  async publishExperience(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() _user: User, // eslint-disable-line @typescript-eslint/no-unused-vars
  ) {
    return this.experiencesService.publishExperience(id);
  }

  @Mutation(() => ExperienceDetailEntity, { name: 'archiveStudentExperience' })
  @Roles('student')
  async archiveExperience(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() _user: User, // eslint-disable-line @typescript-eslint/no-unused-vars
  ) {
    return this.experiencesService.archiveExperience(id);
  }

  @Mutation(() => Boolean, { name: 'deleteStudentExperience' })
  @Roles('student')
  async deleteExperience(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() _user: User, // eslint-disable-line @typescript-eslint/no-unused-vars
  ) {
    await this.experiencesService.deleteExperience(id);
    return true;
  }
}
