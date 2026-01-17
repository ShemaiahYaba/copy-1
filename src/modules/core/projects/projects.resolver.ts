// ============================================================================
// PART 5: GRAPHQL RESOLVER
// src/modules/projects/projects.resolver.ts
// ============================================================================

import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard } from '@modules/core/auth/guards';
import { Roles, CurrentUser } from '@modules/core/auth/decorators';
import type { User } from '@modules/core/auth/models/user.model';
import { ProjectsService } from './projects.service';
import {
  ProjectEntity,
  PaginatedProjectsResponse,
  StudentProjectFeedResponse,
  StudentProjectFeedSearchResult,
} from './entities/project.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { FilterProjectsDto } from './dto/filter-projects.dto';
import {
  CursorPaginationInput,
  ProjectFeedFilterInput,
} from './dto/student-feed.dto';

@Resolver(() => ProjectEntity)
export class ProjectsResolver {
  constructor(private readonly projectsService: ProjectsService) {}

  @Mutation(() => ProjectEntity)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('client')
  async createProject(
    @Args('input') input: CreateProjectDto,
    @CurrentUser() _user: User, // eslint-disable-line @typescript-eslint/no-unused-vars
  ) {
    return this.projectsService.create(input);
  }

  @Query(() => PaginatedProjectsResponse, { name: 'projects' })
  async getProjects(@Args('filters') filters: FilterProjectsDto) {
    return this.projectsService.findAll(filters);
  }

  @Query(() => StudentProjectFeedResponse, { name: 'studentProjectFeedCursor' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('student')
  async studentProjectFeed(
    @Args('studentId', { type: () => ID }) studentId: string,
    @Args('filters', { nullable: true }) filters: ProjectFeedFilterInput,
    @Args('pagination', { nullable: true }) pagination: CursorPaginationInput,
    @CurrentUser() _user: User, // eslint-disable-line @typescript-eslint/no-unused-vars
  ) {
    return this.projectsService.studentProjectFeed(
      studentId,
      filters,
      pagination,
    );
  }

  @Query(() => StudentProjectFeedSearchResult, {
    name: 'studentProjectFeedSearch',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('student')
  async studentProjectFeedSearch(
    @Args('studentId', { type: () => ID }) studentId: string,
    @Args('term') term: string,
    @CurrentUser() _user: User, // eslint-disable-line @typescript-eslint/no-unused-vars
  ) {
    return this.projectsService.studentProjectFeedSearch(studentId, term);
  }

  @Query(() => ProjectEntity, { name: 'project' })
  async getProject(@Args('id', { type: () => ID }) id: string) {
    return this.projectsService.findOne(id);
  }

  @Mutation(() => ProjectEntity)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('client')
  async updateProject(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateProjectDto,
    @CurrentUser() _user: User, // eslint-disable-line @typescript-eslint/no-unused-vars
  ) {
    return this.projectsService.update(id, input);
  }

  @Mutation(() => ProjectEntity)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('client')
  async deleteProject(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() _user: User, // eslint-disable-line @typescript-eslint/no-unused-vars
  ) {
    return this.projectsService.remove(id);
  }

  @Mutation(() => ProjectEntity)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('client')
  async publishProject(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() _user: User, // eslint-disable-line @typescript-eslint/no-unused-vars
  ) {
    return this.projectsService.publish(id);
  }

  @Mutation(() => ProjectEntity)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('supervisor', 'university')
  async approveProject(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() _user: User, // eslint-disable-line @typescript-eslint/no-unused-vars
  ) {
    return this.projectsService.approve(id);
  }

  @Mutation(() => ProjectEntity)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('supervisor', 'university')
  async assignProjectToTeam(
    @Args('projectId', { type: () => ID }) projectId: string,
    @Args('teamId', { type: () => ID }) teamId: string,
    @CurrentUser() _user: User, // eslint-disable-line @typescript-eslint/no-unused-vars
  ) {
    return this.projectsService.assignTeam(projectId, teamId);
  }

  @Query(() => PaginatedProjectsResponse, { name: 'myProjects' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('client')
  async getMyProjects(
    @Args('filters') filters: FilterProjectsDto,
    @CurrentUser() _user: User, // eslint-disable-line @typescript-eslint/no-unused-vars
  ) {
    return this.projectsService.getMyProjects(filters);
  }
}
