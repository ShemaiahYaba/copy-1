// ============================================================================
// STUDENT BOOKMARKS RESOLVER
// src/modules/students/subdomains/bookmarks/bookmarks.resolver.ts
// ============================================================================

import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard } from '@modules/core/auth/guards';
import { Roles, CurrentUser } from '@modules/core/auth/decorators';
import type { User } from '@modules/core/auth/models/user.model';
import { StudentBookmarksService } from './bookmarks.service';
import {
  BookmarkEntity,
  PaginatedBookmarksResponse,
} from './entities/bookmark.entity';
import { CreateBookmarkDto } from './dto/create-bookmark.dto';
import { FilterBookmarksDto } from './dto/filter-bookmarks.dto';
import { BulkDeleteBookmarksDto } from './dto/bulk-delete-bookmarks.dto';

@Resolver(() => BookmarkEntity)
@UseGuards(JwtAuthGuard, RolesGuard)
export class StudentBookmarksResolver {
  constructor(private readonly bookmarksService: StudentBookmarksService) {}

  @Mutation(() => BookmarkEntity)
  @Roles('student')
  async createBookmark(
    @Args('input') input: CreateBookmarkDto,
    @CurrentUser() _user: User, // eslint-disable-line @typescript-eslint/no-unused-vars
  ) {
    return this.bookmarksService.create(input);
  }

  @Query(() => PaginatedBookmarksResponse, { name: 'studentBookmarks' })
  @Roles('student')
  async getBookmarks(
    @Args('filters') filters: FilterBookmarksDto,
    @CurrentUser() _user: User, // eslint-disable-line @typescript-eslint/no-unused-vars
  ) {
    return this.bookmarksService.findAll(filters);
  }

  @Query(() => BookmarkEntity, { name: 'studentBookmark' })
  @Roles('student')
  async getBookmark(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() _user: User, // eslint-disable-line @typescript-eslint/no-unused-vars
  ) {
    return this.bookmarksService.findOne(id);
  }

  @Mutation(() => Boolean)
  @Roles('student')
  async removeBookmark(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() _user: User, // eslint-disable-line @typescript-eslint/no-unused-vars
  ) {
    await this.bookmarksService.remove(id);
    return true;
  }

  @Mutation(() => Boolean)
  @Roles('student')
  async removeBookmarkByProject(
    @Args('projectId', { type: () => ID }) projectId: string,
    @CurrentUser() _user: User, // eslint-disable-line @typescript-eslint/no-unused-vars
  ) {
    await this.bookmarksService.removeByProjectId(projectId);
    return true;
  }

  @Mutation(() => Boolean)
  @Roles('student')
  async bulkDeleteBookmarks(
    @Args('input') input: BulkDeleteBookmarksDto,
    @CurrentUser() _user: User, // eslint-disable-line @typescript-eslint/no-unused-vars
  ) {
    await this.bookmarksService.bulkDelete(input);
    return true;
  }

  @Query(() => [ID], { name: 'searchBookmarks' })
  @Roles('student')
  async searchBookmarks(
    @Args('term') term: string,
    @CurrentUser() _user: User, // eslint-disable-line @typescript-eslint/no-unused-vars
  ) {
    const result = await this.bookmarksService.search(term);
    return result.bookmarkIds;
  }

  @Query(() => Number, { name: 'studentBookmarkCount' })
  @Roles('student')
  async getBookmarkCount(
    @CurrentUser() _user: User, // eslint-disable-line @typescript-eslint/no-unused-vars
  ) {
    return this.bookmarksService.getCount();
  }
}
