// src/modules/core/auth/auth.controller.ts
import { Controller, Post, Body, HttpCode, Headers } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  ApiCreate,
  ApiLogin,
  ApiCustom,
} from '@modules/api-docs/api-docs.decorator';

import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator'; // ✅ IMPORT THIS

import {
  RegisterClientDto,
  RegisterSupervisorDto,
  RegisterStudentDto,
  RegisterUniversityDto,
  LoginDto,
  LogoutDto,
  VerifySessionDto,
  RefreshTokenDto,
  AuthResponseDto,
  LogoutResponseDto,
  TokenResponseDto,
  VerifySessionResponseDto,
} from './dto/register.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ==========================================================================
  // REGISTRATION ENDPOINTS
  // ==========================================================================

  @Post('register/client')
  @Public() // ✅ ADDED - Bypass JwtAuthGuard
  @ApiCreate('client', RegisterClientDto, AuthResponseDto, { auth: false })
  async registerClient(
    @Body() dto: RegisterClientDto,
  ): Promise<AuthResponseDto> {
    return this.authService.registerClient(dto);
  }

  @Post('register/supervisor')
  @Public() // ✅ ADDED
  @ApiCreate('supervisor', RegisterSupervisorDto, AuthResponseDto, {
    auth: false,
  })
  async registerSupervisor(
    @Body() dto: RegisterSupervisorDto,
  ): Promise<AuthResponseDto> {
    return this.authService.registerSupervisor(dto);
  }

  @Post('register/student')
  @Public() // ✅ ADDED
  @ApiCreate('student', RegisterStudentDto, AuthResponseDto, { auth: false })
  async registerStudent(
    @Body() dto: RegisterStudentDto,
  ): Promise<AuthResponseDto> {
    return this.authService.registerStudent(dto);
  }

  @Post('register/university')
  @Public() // ✅ ADDED
  @ApiCreate('university', RegisterUniversityDto, AuthResponseDto, {
    auth: false,
  })
  async registerUniversity(
    @Body() dto: RegisterUniversityDto,
  ): Promise<AuthResponseDto> {
    return this.authService.registerUniversity(dto);
  }

  // ==========================================================================
  // AUTHENTICATION ENDPOINTS
  // ==========================================================================

  @Post('login')
  @Public() // ✅ ADDED
  @HttpCode(200)
  @ApiLogin(LoginDto, AuthResponseDto)
  async login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  @Post('logout')
  @Public() // ✅ ADDED (logout doesn't need auth in most systems)
  @HttpCode(200)
  @ApiCustom({
    summary: 'Logout user',
    description: 'Invalidate Supabase session and end user session',
    successStatus: 200,
    body: LogoutDto,
    responseType: LogoutResponseDto,
    auth: false,
  })
  async logout(
    @Body() dto: LogoutDto,
    @Headers('x-user-id') userId?: string,
  ): Promise<LogoutResponseDto> {
    await this.authService.logout(dto.accessToken, userId);
    return { message: 'Logged out successfully' };
  }

  // ==========================================================================
  // SESSION & TOKEN MANAGEMENT
  // ==========================================================================

  @Post('verify-session')
  @Public() // ✅ ADDED (verification endpoint should be public)
  @HttpCode(200)
  @ApiCustom({
    summary: 'Verify session',
    description: 'Verify JWT access token and return user data',
    successStatus: 200,
    body: VerifySessionDto,
    responseType: VerifySessionResponseDto,
    auth: false,
  })
  async verifySession(
    @Body() dto: VerifySessionDto,
  ): Promise<VerifySessionResponseDto> {
    return this.authService.verifySession(dto.accessToken);
  }

  @Post('refresh')
  @Public() // ✅ ADDED (refresh endpoint should be public)
  @HttpCode(200)
  @ApiCustom({
    summary: 'Refresh access token',
    description: 'Get new access token using refresh token',
    successStatus: 200,
    body: RefreshTokenDto,
    responseType: TokenResponseDto,
    auth: false,
  })
  async refreshToken(@Body() dto: RefreshTokenDto): Promise<TokenResponseDto> {
    return this.authService.refreshToken(dto.refreshToken);
  }
}
