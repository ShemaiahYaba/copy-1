// ============================================================================
// PART 2: GRAPHQL ENTITIES
// src/modules/bookmarks/entities/bookmark.entity.ts
// ============================================================================

import { ObjectType, Field, ID, Int } from '@nestjs/graphql';

@ObjectType()
export class SharedByEntity {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field({ nullable: true })
  email?: string;
}

@ObjectType()
export class BookmarkEntity {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  studentId: string;

  @Field(() => ID)
  projectId: string;

  @Field(() => SharedByEntity, { nullable: true })
  sharedBy?: SharedByEntity;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

@ObjectType()
export class BookmarkCardEntity {
  @Field(() => ID)
  id: string; // Bookmark ID

  @Field(() => ID)
  projectId: string;

  @Field()
  title: string;

  @Field()
  organization: string;

  @Field({ nullable: true })
  organizationLogoUrl?: string;

  @Field()
  summary: string;

  @Field(() => [String])
  skills: string[];

  @Field()
  difficulty: string;

  @Field(() => [String])
  tags: string[];

  @Field()
  postedAt: Date;

  @Field({ nullable: true })
  timeRemaining?: string; // ISO8601 duration (e.g., "P4M")

  @Field()
  status: string; // ACTIVE, ARCHIVED, FILLED

  @Field(() => SharedByEntity, { nullable: true })
  sharedBy?: SharedByEntity;

  @Field()
  createdAt: Date; // When bookmarked
}

@ObjectType()
export class PaginatedBookmarksResponse {
  @Field(() => [BookmarkCardEntity])
  cards: BookmarkCardEntity[];

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
export class BookmarkFiltersMeta {
  @Field(() => [String])
  availableFilters: string[]; // ["CREATED", "SHARED", "ALL"]

  @Field()
  activeFilter: string;
}

@ObjectType()
export class DeleteBookmarkResponse {
  @Field()
  success: boolean;

  @Field()
  message: string;
}

@ObjectType()
export class BulkDeleteBookmarksResponse {
  @Field(() => Int)
  deletedCount: number;

  @Field()
  success: boolean;

  @Field()
  message: string;
}
