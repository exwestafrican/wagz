import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from '@/fahari/auth/auth.service';
import { MagicLinkAuthDto } from '@/fahari/auth/dto/magic-link-auth';
import { OtpVerificationDto } from '@/fahari/auth/dto/otp-verification.dto';
import { OtpVerificationResponseDto } from '@/fahari/auth/dto/otp-verification-response.dto';
import ApiBadRequestResponse from '@/common/decorators/bad-response';

@Controller('fahari/auth')
@ApiTags('fahari-auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('admin/login')
  @ApiOperation({ summary: 'Login as a Fahari super admin' })
  @ApiBody({ type: MagicLinkAuthDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Admin magic link sent',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid credentials',
  })
  @ApiBadRequestResponse()
  @HttpCode(HttpStatus.OK)
  requestAdminMagicLink(@Body() dto: MagicLinkAuthDto): Promise<void> {
    return this.authService.requestAdminMagicLinkOrThrow(dto.email);
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
    const response = await this.authService.verifyOtpOrThrow(
      otpVerificationDto.email,
      otpVerificationDto.otp,
    );
    return {
      accessToken: response.accessToken,
    };
  }
}
