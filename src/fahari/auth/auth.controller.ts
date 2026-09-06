import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from '@/fahari/auth/auth.service';
import { MagicLinkAuthDto } from '@/fahari/auth/dto/magic-link-auth';
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
}
