// ============================================================================
// PART 3: DTOs
// src/modules/bookmarks/dto/create-bookmark.dto.ts
// ============================================================================

import { InputType, Field, ID } from '@nestjs/graphql';
import { IsUUID, IsNotEmpty, IsOptional } from 'class-validator';

@InputType()
export class CreateBookmarkDto {
  @Field(() => ID)
  @IsUUID()
  @IsNotEmpty()
  projectId: string;

  @Field(() => ID, { nullable: true })
  @IsUUID()
  @IsOptional()
  sharedBy?: string; // If bookmark is being shared by supervisor
}
