// ============================================================================
// src/modules/bookmarks/dto/bulk-delete-bookmarks.dto.ts
// ============================================================================

import { InputType, Field, ID } from '@nestjs/graphql';
import { IsArray, IsUUID, ArrayMinSize, ArrayMaxSize } from 'class-validator';

@InputType()
export class BulkDeleteBookmarksDto {
  @Field(() => [ID])
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMinSize(1, { message: 'At least one bookmark ID must be provided' })
  @ArrayMaxSize(100, {
    message: 'Cannot delete more than 100 bookmarks at once',
  })
  bookmarkIds: string[];
}
