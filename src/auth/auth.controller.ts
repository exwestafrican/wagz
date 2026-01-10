import {
  Body,
  ConflictException,
  Controller,
  HttpCode,
  InternalServerErrorException,
  Logger,
  Post,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { MagicLinkAuthDto } from './dto/magic-link-auth';
import { SignupEmailDto } from './dto/signup.dto';
import { AccountExistsException } from './exceptions/account.exists';
import ValidationErrorResponseDto from '@/common/dto/validation-error.dto';

@Controller('auth')
@ApiTags('auth')
export class AuthController {
  logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Post('magic-link/request')
  @ApiOperation({ summary: 'Allow user to authenticate with a magic link' })
  @ApiBody({ type: MagicLinkAuthDto })
  @ApiResponse({ status: 200, description: 'Magic link sent successfully' })
  @HttpCode(200)
  requestMagicLink(@Body() magicLinkAuthDto: MagicLinkAuthDto): void {
    this.authService.requestMagicLink(magicLinkAuthDto);
  }

  @Post('signup/email-only')
  @ApiOperation({ summary: 'Allow user to sign up' })
  @ApiBody({ type: SignupEmailDto })
  @ApiResponse({ status: 201, description: 'User signed up successfully' })
  @ApiResponse({
    status: 503,
    description: 'Sign up process is currently unavailable.',
  })
  @ApiResponse({
    status: 500,
    description: 'Something went wrong when signing up user.',
  })
  @ApiResponse({ status: 409, description: 'User already exists.' })
  @ApiResponse({
    status: 400,
    description: 'Invalid input',
    type: ValidationErrorResponseDto,
  })
  async signup(@Body() signupDto: SignupEmailDto): Promise<void> {
    try {
      return await this.authService.emailOnlySignup(
        SignupEmailDto.toSignupDetails(signupDto),
      );
    } catch (error) {
      if (error instanceof AccountExistsException) {
        this.logger.error(error);
        throw new ConflictException(error.message);
      } else if (error instanceof ServiceUnavailableException) {
        this.logger.error(error);
        this.logger.error('Supabase is currently unavailable for user sign up');
        throw new ServiceUnavailableException(
          "Sign up process is currently unavailable. We will email you with a sign up link when it's back online.",
        );
      } else {
        this.logger.error(error);
        this.logger.error('Something went wrong when signing up user');
        throw new InternalServerErrorException('something went wrong');
      }
    }
  }
}
