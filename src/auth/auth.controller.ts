import {
  Body,
  ConflictException,
  Controller,
  HttpCode,
  HttpStatus,
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
import ApiBadRequestResponse from '@/common/decorators/bad-response';

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
    return this.authService.requestMagicLink(magicLinkAuthDto.email);
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
  async signup(@Body() signupDto: SignupEmailDto): Promise<void> {
    try {
      await this.authService.emailOnlySignup(
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
