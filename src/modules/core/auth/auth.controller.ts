// src/modules/auth/auth.controller.ts
import { Controller, Post, Body, HttpCode, Headers } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  ApiCreate,
  ApiLogin,
  ApiCustom,
} from '@modules/api-docs/api-docs.decorator';

import { AuthService } from './auth.service';

import {
  RegisterClientDto,
  RegisterSupervisorDto,
  RegisterStudentDto,
  RegisterUniversityDto,
  LoginDto,
  LogoutDto,
  AuthResponseDto,
  LogoutResponseDto,
  SessionDto,
} from './dto/register.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ==========================================================================
  // REGISTRATION ENDPOINTS
  // ==========================================================================

  @Post('register/client')
  @ApiCreate('client', RegisterClientDto, AuthResponseDto, { auth: false })
  async registerClient(
    @Body() dto: RegisterClientDto,
  ): Promise<AuthResponseDto> {
    return this.authService.registerClient(dto);
  }

  @Post('register/supervisor')
  @ApiCreate('supervisor', RegisterSupervisorDto, AuthResponseDto, {
    auth: false,
  })
  async registerSupervisor(
    @Body() dto: RegisterSupervisorDto,
  ): Promise<AuthResponseDto> {
    return this.authService.registerSupervisor(dto);
  }

  @Post('register/student')
  @ApiCreate('student', RegisterStudentDto, AuthResponseDto, { auth: false })
  async registerStudent(
    @Body() dto: RegisterStudentDto,
  ): Promise<AuthResponseDto> {
    return this.authService.registerStudent(dto);
  }

  @Post('register/university')
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
  @HttpCode(200)
  @ApiLogin(LoginDto, AuthResponseDto)
  async login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  @Post('logout')
  @HttpCode(200)
  @ApiCustom({
    summary: 'Logout user',
    description: 'Invalidate Appwrite session and end user session',
    successStatus: 200,
    body: LogoutDto,
    responseType: LogoutResponseDto,
    auth: false,
  })
  async logout(
    @Body() dto: LogoutDto,
    @Headers('x-user-id') userId?: string,
  ): Promise<LogoutResponseDto> {
    await this.authService.logout(dto.sessionId, userId);
    return { message: 'Logged out successfully' };
  }

  // ==========================================================================
  // SESSION VERIFICATION
  // ==========================================================================

  @Post('verify-session')
  @HttpCode(200)
  @ApiCustom({
    summary: 'Verify session',
    description: 'Verify Appwrite session and return user data',
    successStatus: 200,
    auth: false,
  })
  async verifySession(
    @Body() dto: { sessionId: string },
  ): Promise<{ user: any; session: SessionDto }> {
    return this.authService.verifySession(dto.sessionId);
  }

  @Post('session')
  @HttpCode(200)
  @ApiCustom({
    summary: 'Get session details',
    description: 'Get current Appwrite session details',
    successStatus: 200,
    auth: false,
  })
  async getSession(@Body() dto: { sessionId: string }): Promise<SessionDto> {
    const session = await this.authService.getCurrentSession(dto.sessionId);
    return {
      sessionId: session.$id,
      userId: session.userId,
      expire: session.expire,
    };
  }
}
