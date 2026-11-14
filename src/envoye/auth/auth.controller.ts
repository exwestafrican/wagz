import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { MagicLinkAuthDto } from './dto/magic-link-auth';
import { SignupEmailDto } from './dto/signup.dto';
import ApiBadRequestResponse from '@/common/decorators/bad-response';
import { OtpVerificationDto } from './dto/otp-verification.dto';
import { OtpVerificationResponseDto } from '@/envoye/auth/dto/otp-verification-response.dto';

@Controller('auth')
@ApiTags('auth')
export class AuthController {
  logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Post('magic-link/request')
  @ApiOperation({ summary: 'Allow user to authenticate with a magic link' })
  @ApiBody({ type: MagicLinkAuthDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Magic link sent successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Magic link request failed',
  })
  @HttpCode(HttpStatus.OK)
  requestMagicLink(@Body() magicLinkAuthDto: MagicLinkAuthDto): Promise<void> {
    return this.authService.requestMagicLinkOrThrow(magicLinkAuthDto.email);
  }

  @Post('verify-otp')
  @ApiOperation({ summary: 'Allow user to verify OTP' })
  @ApiBody({ type: OtpVerificationDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'OTP verified successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid OTP',
  })
  @HttpCode(HttpStatus.OK)
  async verifyOtp(
    @Body() otpVerificationDto: OtpVerificationDto,
  ): Promise<OtpVerificationResponseDto> {
    const response = (await this.authService.verifyOtpOrThrow(
      otpVerificationDto.email,
      otpVerificationDto.otp,
    )) as OtpVerificationResponseDto;
    return {
      workspaceCode: response.workspaceCode,
      accessToken: response.accessToken,
    };
  }

  @Post('admin/login')
  @ApiOperation({ summary: 'Login as an admin' })
  @ApiBody({ type: MagicLinkAuthDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Admin magic link sent',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid credentials',
  })
  @HttpCode(HttpStatus.OK)
  requestAdminMagicLink(@Body() dto: MagicLinkAuthDto): Promise<void> {
    return this.authService.requestAdminMagicLinkOrThrow(dto.email);
  }

  @Post('signup/email-only')
  @ApiOperation({ summary: 'Allow user to sign up' })
  @ApiBody({ type: SignupEmailDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User signed up successfully',
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'Sign up process is currently unavailable.',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Something went wrong when signing up user.',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'User already exists.',
  })
  @ApiBadRequestResponse()
  signup(): Promise<void> {
    throw new BadRequestException('');
  }
}
