// src/modules/auth/dto/register.dto.ts
import {
  IsEmail,
  IsString,
  MinLength,
  Matches,
  IsOptional,
  IsUUID,
  IsArray,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// ============================================================================
// BASE REGISTER DTO
// ============================================================================

export class RegisterBaseDto {
  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@company.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Password (min 8 chars, 1 uppercase, 1 number, 1 special)',
    example: 'SecurePass123!',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'Password must contain uppercase, lowercase, number, and special character',
  })
  password: string;
}

// ============================================================================
// CLIENT REGISTRATION
// ============================================================================

export class RegisterClientDto extends RegisterBaseDto {
  @ApiProperty({
    description: 'Organization name',
    example: 'Acme Corporation',
  })
  @IsString()
  @MinLength(2)
  organizationName: string;

  @ApiProperty({
    description: 'Industry sector',
    example: 'Technology',
    required: false,
  })
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiProperty({
    description: 'Organization verification document URL',
    example: 'https://storage.example.com/docs/certificate.pdf',
    required: false,
  })
  @IsOptional()
  @IsString()
  orgDocumentUrl?: string;
}

// ============================================================================
// SUPERVISOR REGISTRATION
// ============================================================================

export class RegisterSupervisorDto extends RegisterBaseDto {
  @ApiProperty({
    description: 'University ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  universityId: string;

  @ApiProperty({
    description: 'Employment verification document URL',
    example: 'https://storage.example.com/docs/employment.pdf',
    required: false,
  })
  @IsOptional()
  @IsString()
  employmentDocumentUrl?: string;
}

// ============================================================================
// STUDENT REGISTRATION
// ============================================================================

export class RegisterStudentDto extends RegisterBaseDto {
  @ApiProperty({
    description: 'Student matriculation number',
    example: 'MAT2021/001234',
  })
  @IsString()
  @MinLength(3)
  matricNumber: string;

  @ApiProperty({
    description: 'Student skills',
    example: ['JavaScript', 'React', 'Node.js'],
    required: false,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];
}

// ============================================================================
// UNIVERSITY REGISTRATION
// ============================================================================

export class RegisterUniversityDto extends RegisterBaseDto {
  @ApiProperty({
    description: 'University name',
    example: 'University of Lagos',
  })
  @IsString()
  @MinLength(3)
  name: string;

  @ApiProperty({
    description: 'University location',
    example: 'Lagos, Nigeria',
    required: false,
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({
    description: 'Verification document URL',
    example: 'https://storage.example.com/docs/accreditation.pdf',
    required: false,
  })
  @IsOptional()
  @IsString()
  verificationDocumentUrl?: string;
}

// ============================================================================
// LOGIN DTO
// ============================================================================

export class LoginDto {
  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@company.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'User password',
    example: 'SecurePass123!',
  })
  @IsString()
  password: string;
}

// ============================================================================
// SESSION DTO (UPDATED FOR SUPABASE)
// ============================================================================

export class SessionDto {
  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'Refresh token for obtaining new access tokens',
    example: 'v1.MRjcAl-iNRhCfJECd...',
  })
  refreshToken: string;

  @ApiProperty({
    description: 'Token expiration timestamp (Unix time)',
    example: 1703721600,
  })
  expiresAt: number;
}

// ============================================================================
// LOGOUT DTO (UPDATED)
// ============================================================================

export class LogoutDto {
  @ApiProperty({
    description: 'JWT access token to invalidate',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  accessToken: string;
}

// ============================================================================
// VERIFY SESSION DTO (NEW)
// ============================================================================

export class VerifySessionDto {
  @ApiProperty({
    description: 'JWT access token to verify',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  accessToken: string;
}

// ============================================================================
// REFRESH TOKEN DTO (NEW)
// ============================================================================

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh token',
    example: 'v1.MRjcAl-iNRhCfJECd...',
  })
  @IsString()
  refreshToken: string;
}

// ============================================================================
// RESPONSE DTOs
// ============================================================================

export class UserResponseDto {
  @ApiProperty({
    description: 'User ID (Supabase UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'User email',
    example: 'john.doe@company.com',
  })
  email: string;

  @ApiProperty({
    description: 'User role',
    example: 'client',
    enum: ['client', 'supervisor', 'student', 'university'],
  })
  role: string;

  @ApiProperty({
    description: 'Account active status',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Account creation date',
    example: '2025-11-23T12:00:00Z',
  })
  createdAt: Date;
}

export class ClientProfileDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'Acme Corporation' })
  organizationName: string;

  @ApiProperty({ example: 'Technology', required: false })
  industry?: string;
}

export class SupervisorProfileDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  universityId: string;

  @ApiProperty({ example: 'employed', enum: ['employed', 'resigned'] })
  employmentStatus: string;
}

export class StudentProfileDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'MAT2021/001234' })
  matricNumber: string;

  @ApiProperty({ example: 'active', enum: ['active', 'graduated', 'deferred'] })
  graduationStatus: string;

  @ApiProperty({ example: ['JavaScript', 'React'], required: false })
  skills?: string[];
}

export class UniversityProfileDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'University of Lagos' })
  name: string;

  @ApiProperty({ example: 'Lagos, Nigeria', required: false })
  location?: string;

  @ApiProperty({ example: false })
  isVerified: boolean;
}

export class AuthResponseDto {
  @ApiProperty({ type: UserResponseDto })
  user: UserResponseDto;

  @ApiProperty({ type: SessionDto })
  session: SessionDto;

  @ApiProperty({
    description: 'Role-specific profile',
    oneOf: [
      { $ref: '#/components/schemas/ClientProfileDto' },
      { $ref: '#/components/schemas/SupervisorProfileDto' },
      { $ref: '#/components/schemas/StudentProfileDto' },
      { $ref: '#/components/schemas/UniversityProfileDto' },
    ],
    required: false,
  })
  profile?:
    | ClientProfileDto
    | SupervisorProfileDto
    | StudentProfileDto
    | UniversityProfileDto;
}

export class LogoutResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'Logged out successfully',
  })
  message: string;
}

// ============================================================================
// TOKEN RESPONSE DTO (NEW)
// ============================================================================

export class TokenResponseDto {
  @ApiProperty({
    description: 'New JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'New refresh token',
    example: 'v1.MRjcAl-iNRhCfJECd...',
  })
  refreshToken: string;

  @ApiProperty({
    description: 'Token expiration timestamp',
    example: 1703721600,
  })
  expiresAt: number;
}

// ============================================================================
// VERIFY SESSION RESPONSE DTO (NEW)
// ============================================================================

export class VerifySessionResponseDto {
  @ApiProperty({ type: UserResponseDto })
  user: UserResponseDto;

  @ApiProperty({
    description: 'Role-specific profile',
    oneOf: [
      { $ref: '#/components/schemas/ClientProfileDto' },
      { $ref: '#/components/schemas/SupervisorProfileDto' },
      { $ref: '#/components/schemas/StudentProfileDto' },
      { $ref: '#/components/schemas/UniversityProfileDto' },
    ],
    required: false,
  })
  profile?:
    | ClientProfileDto
    | SupervisorProfileDto
    | StudentProfileDto
    | UniversityProfileDto;
}
