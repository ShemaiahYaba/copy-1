// ----------------------------------------------------------------------------
// 3. DTO - context-config.dto.ts
// ----------------------------------------------------------------------------
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsArray,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ContextStorageAdapter {
  CLS = 'cls', // nestjs-cls (recommended)
  ASYNC_HOOKS = 'async_hooks', // Node.js async_hooks
}

export enum UserIdSource {
  HEADER = 'header', // From request header
  JWT = 'jwt', // Extract from JWT token
  SESSION = 'session', // From session
  CUSTOM = 'custom', // Custom extraction logic
}

class HeaderNamesDto {
  @IsString()
  userId: string = 'x-user-id';

  @IsString()
  orgId: string = 'x-org-id';

  @IsOptional()
  @IsString()
  correlationId?: string = 'x-correlation-id';
}

export class ContextConfigDto {
  @IsEnum(ContextStorageAdapter)
  adapter: ContextStorageAdapter = ContextStorageAdapter.CLS;

  @IsEnum(UserIdSource)
  userIdSource: UserIdSource = UserIdSource.JWT;

  @IsBoolean()
  autoGenerate: boolean = true; // Auto-generate correlation ID

  @IsBoolean()
  includeRequestDetails: boolean = true; // path, method, etc.

  @IsBoolean()
  includeUserAgent: boolean = false;

  @IsBoolean()
  includeIp: boolean = true;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  customHeaders?: string[]; // Additional headers to capture

  @ValidateNested()
  @Type(() => HeaderNamesDto)
  headerNames: HeaderNamesDto = new HeaderNamesDto();
}
