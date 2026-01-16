// ============================================================================
// PART 5: GRAPHQL RESOLVER
// src/modules/bookmarks/bookmarks.resolver.ts
// ============================================================================

import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard } from '@modules/core/auth/guards';
import { Roles, CurrentUser } from '@modules/core/auth/decorators';
import type { User } from '@modules/core/auth/models/user.model';
import { BookmarksService } from './bookmarks.service';
import {
  BookmarkEntity,
  PaginatedBookmarksResponse,
  DeleteBookmarkResponse,
  BulkDeleteBookmarksResponse,
} from './entities/bookmark.entity';
import { CreateBookmarkDto } from './dto/create-bookmark.dto';
import { FilterBookmarksDto } from './dto/filter-bookmarks.dto';
import { BulkDeleteBookmarksDto } from './dto/bulk-delete-bookmarks.dto';

@Resolver(() => BookmarkEntity)
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('student')
export class BookmarksResolver {
  constructor(private readonly bookmarksService: BookmarksService) {}

  @Mutation(() => BookmarkEntity)
  async createBookmark(
    @Args('input') input: CreateBookmarkDto,
    @CurrentUser() _user: User, // eslint-disable-line @typescript-eslint/no-unused-vars
  ) {
    return this.bookmarksService.create(input);
  }

  @Query(() => PaginatedBookmarksResponse, { name: 'studentBookmarks' })
  async getBookmarks(
    @Args('filters') filters: FilterBookmarksDto,
    @CurrentUser() _user: User, // eslint-disable-line @typescript-eslint/no-unused-vars
  ) {
    return this.bookmarksService.findAll(filters);
  }

  @Query(() => BookmarkEntity, { name: 'studentBookmark' })
  async getBookmark(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() _user: User, // eslint-disable-line @typescript-eslint/no-unused-vars
  ) {
    return this.bookmarksService.findOne(id);
  }

  @Mutation(() => DeleteBookmarkResponse)
  async deleteBookmark(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() _user: User, // eslint-disable-line @typescript-eslint/no-unused-vars
  ) {
    return this.bookmarksService.remove(id);
  }

  @Mutation(() => DeleteBookmarkResponse)
  async deleteBookmarkByProjectId(
    @Args('projectId', { type: () => ID }) projectId: string,
    @CurrentUser() _user: User, // eslint-disable-line @typescript-eslint/no-unused-vars
  ) {
    return this.bookmarksService.removeByProjectId(projectId);
  }

  @Mutation(() => BulkDeleteBookmarksResponse)
  async bulkDeleteBookmarks(
    @Args('input') input: BulkDeleteBookmarksDto,
    @CurrentUser() _user: User, // eslint-disable-line @typescript-eslint/no-unused-vars
  ) {
    return this.bookmarksService.bulkDelete(input);
  }

  @Query(() => [ID], { name: 'searchBookmarks' })
  async searchBookmarks(
    @Args('term') term: string,
    @CurrentUser() _user: User, // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<{ bookmarkIds: string[] }> {
    return this.bookmarksService.search(term);
  }

  @Query(() => Number, { name: 'bookmarkCount' })
  async getBookmarkCount(
    @CurrentUser() _user: User, // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<number> {
    return this.bookmarksService.getCount();
  }
}
