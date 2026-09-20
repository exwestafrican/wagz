import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from '@/fahari/auth/auth.service';
import { MagicLinkAuthDto } from '@/fahari/auth/dto/magic-link-auth';
import { OtpVerificationDto } from '@/fahari/auth/dto/otp-verification.dto';
import { OtpVerificationResponseDto } from '@/fahari/auth/dto/otp-verification-response.dto';
import {
  toUserProfileResponse,
  UserProfileResponseDto,
} from '@/fahari/auth/dto/user-profile-response.dto';
import ApiBadRequestResponse from '@/common/decorators/bad-response';
import { SupabaseAuthGuard } from '@/auth/guard/supabase.guard';
import { User } from '@/auth/decorator/user.decorator';
import RequestUser from '@/auth/domain/request-user';
import NotFoundInDb from '@/common/exceptions/not-found';

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

  @Get('me')
  @ApiOperation({ summary: 'Get the currently logged in user profile' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Current user profile',
    type: UserProfileResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User is unauthorized to make this request',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  @UseGuards(SupabaseAuthGuard)
  async getLoggedInUserProfile(
    @User() requestUser: RequestUser,
  ): Promise<UserProfileResponseDto> {
    try {
      const user = await this.authService.getLoggedInUserProfile(
        requestUser.email,
      );
      return toUserProfileResponse(user);
    } catch (error) {
      if (error instanceof NotFoundInDb) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }
}
