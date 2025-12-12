// src/modules/core/auth/auth.controller.ts
import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiCreate, ApiCustom } from '@modules/api-docs/api-docs.decorator';

import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';

import {
  RegisterClientDto,
  RegisterSupervisorDto,
  RegisterStudentDto,
  RegisterUniversityDto,
  LogoutDto,
  VerifySessionDto,
  RefreshTokenDto,
  AuthResponseDto,
  LogoutResponseDto,
  TokenResponseDto,
  VerifySessionResponseDto,
  VerifyOTPDto,
  InitiateOTPLoginDto,
  ResendOTPDto,
  OTPSentResponseDto,
  RegistrationPendingResponseDto,
} from './dto/register.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ==========================================================================
  // REGISTRATION ENDPOINTS (OTP FLOW)
  // ==========================================================================

  @Post('register/client')
  @Public()
  @ApiCreate('client', RegisterClientDto, RegistrationPendingResponseDto, {
    auth: false,
  })
  async registerClient(
    @Body() dto: RegisterClientDto,
  ): Promise<RegistrationPendingResponseDto> {
    return this.authService.registerClient(dto);
  }

  @Post('register/supervisor')
  @Public()
  @ApiCreate(
    'supervisor',
    RegisterSupervisorDto,
    RegistrationPendingResponseDto,
    {
      auth: false,
    },
  )
  async registerSupervisor(
    @Body() dto: RegisterSupervisorDto,
  ): Promise<RegistrationPendingResponseDto> {
    return this.authService.registerSupervisor(dto);
  }

  @Post('register/student')
  @Public()
  @ApiCreate('student', RegisterStudentDto, RegistrationPendingResponseDto, {
    auth: false,
  })
  async registerStudent(
    @Body() dto: RegisterStudentDto,
  ): Promise<RegistrationPendingResponseDto> {
    return this.authService.registerStudent(dto);
  }

  @Post('register/university')
  @Public()
  @ApiCreate(
    'university',
    RegisterUniversityDto,
    RegistrationPendingResponseDto,
    {
      auth: false,
    },
  )
  async registerUniversity(
    @Body() dto: RegisterUniversityDto,
  ): Promise<RegistrationPendingResponseDto> {
    return this.authService.registerUniversity(dto);
  }

  // ==========================================================================
  // OTP VERIFICATION ENDPOINT
  // ==========================================================================

  @Post('verify-otp')
  @Public()
  @HttpCode(200)
  @ApiCustom({
    summary: 'Verify OTP after registration',
    description: 'Complete registration by verifying the OTP sent to email',
    successStatus: 200,
    body: VerifyOTPDto,
    responseType: AuthResponseDto,
    auth: false,
  })
  async verifyRegistrationOTP(
    @Body() dto: VerifyOTPDto,
  ): Promise<AuthResponseDto> {
    return this.authService.verifyRegistrationOTP(dto);
  }

  // ==========================================================================
  // LOGIN ENDPOINTS (OTP FLOW)
  // ==========================================================================

  @Post('login/initiate')
  @Public()
  @HttpCode(200)
  @ApiCustom({
    summary: 'Initiate OTP login',
    description: 'Send OTP to user email for login',
    successStatus: 200,
    body: InitiateOTPLoginDto,
    responseType: OTPSentResponseDto,
    auth: false,
  })
  async initiateOTPLogin(
    @Body() dto: InitiateOTPLoginDto,
  ): Promise<OTPSentResponseDto> {
    return this.authService.initiateOTPLogin(dto);
  }

  @Post('login/verify')
  @Public()
  @HttpCode(200)
  @ApiCustom({
    summary: 'Complete OTP login',
    description: 'Verify OTP and complete login',
    successStatus: 200,
    body: VerifyOTPDto,
    responseType: AuthResponseDto,
    auth: false,
  })
  async verifyLoginOTP(@Body() dto: VerifyOTPDto): Promise<AuthResponseDto> {
    return this.authService.verifyLoginOTP(dto);
  }

  // ==========================================================================
  // OTP MANAGEMENT
  // ==========================================================================

  @Post('resend-otp')
  @Public()
  @HttpCode(200)
  @ApiCustom({
    summary: 'Resend OTP',
    description: 'Resend OTP code to user email',
    successStatus: 200,
    body: ResendOTPDto,
    responseType: OTPSentResponseDto,
    auth: false,
  })
  async resendOTP(@Body() dto: ResendOTPDto): Promise<OTPSentResponseDto> {
    return this.authService.resendOTP(dto);
  }

  // ==========================================================================
  // OTHER AUTH ENDPOINTS (Unchanged)
  // ==========================================================================

  @Post('logout')
  @Public()
  @HttpCode(200)
  @ApiCustom({
    summary: 'Logout user',
    description: 'Invalidate Supabase session and end user session',
    successStatus: 200,
    body: LogoutDto,
    responseType: LogoutResponseDto,
    auth: false,
  })
  async logout(@Body() dto: LogoutDto): Promise<LogoutResponseDto> {
    await this.authService.logout(dto.accessToken);
    return { message: 'Logged out successfully' };
  }

  @Post('verify-session')
  @Public()
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
  @Public()
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
