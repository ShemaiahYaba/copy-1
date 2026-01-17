// ============================================================================
// PROJECT FEED RESOLVER (GraphQL)
// src/modules/students/subdomains/project-feed/project-feed.resolver.ts
// ============================================================================

import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard } from '@modules/core/auth/guards';
import { Roles, CurrentUser } from '@modules/core/auth/decorators';
import type { User } from '@modules/core/auth/models/user.model';
import { ProjectFeedService } from './project-feed.service';
import { ProjectFeedResponse } from './entities/project-card.entity';
import { ProjectFeedFiltersDto } from './dto/project-feed-filters.dto';

@Resolver()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProjectFeedResolver {
  constructor(private readonly projectFeedService: ProjectFeedService) {}

  @Query(() => ProjectFeedResponse, { name: 'studentProjectFeed' })
  @Roles('student')
  async getProjectFeed(
    @Args('filters', { nullable: true }) filters: ProjectFeedFiltersDto,
    @CurrentUser() _user: User, // eslint-disable-line @typescript-eslint/no-unused-vars
  ) {
    return this.projectFeedService.getProjectFeed(filters || {});
  }

  @Query(() => [ID], { name: 'searchProjectFeed' })
  @Roles('student')
  async searchProjects(
    @Args('term') term: string,
    @CurrentUser() _user: User, // eslint-disable-line @typescript-eslint/no-unused-vars
  ) {
    const result = await this.projectFeedService.searchProjects(term);
    return result.cardIds;
  }

  @Mutation(() => Boolean, { name: 'expressProjectInterest' })
  @Roles('student')
  async expressInterest(
    @Args('projectId', { type: () => ID }) projectId: string,
    @CurrentUser() _user: User, // eslint-disable-line @typescript-eslint/no-unused-vars
  ) {
    await this.projectFeedService.expressInterest(projectId);
    return true;
  }

  @Mutation(() => Boolean, { name: 'bookmarkProject' })
  @Roles('student')
  async bookmarkProject(
    @Args('projectId', { type: () => ID }) projectId: string,
    @CurrentUser() _user: User, // eslint-disable-line @typescript-eslint/no-unused-vars
  ) {
    await this.projectFeedService.bookmarkProject(projectId);
    return true;
  }
}
