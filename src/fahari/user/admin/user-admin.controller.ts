import {
  Controller,
  Get,
  HttpStatus,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserService } from '@/fahari/user/user.service';
import { FahariPermissionService } from '@/fahari/permission/permission.service';
import { ChauffeurResponseDto } from '@/fahari/user/dto/chauffeur-response.dto';
import { SupabaseAuthGuard } from '@/auth/guard/supabase.guard';
import { User } from '@/auth/decorator/user.decorator';
import RequestUser from '@/auth/domain/request-user';

@Controller('fahari/admin')
@ApiTags('fahari-users')
export class UserAdminController {
  constructor(
    private readonly userService: UserService,
    private readonly fahariPermissionService: FahariPermissionService,
  ) {}

  @Get('chauffeurs')
  @ApiOperation({ summary: 'List chauffeurs' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Chauffeurs returned',
    type: [ChauffeurResponseDto],
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Caller is not a Fahari super admin',
  })
  @UseGuards(SupabaseAuthGuard)
  async listChauffeurs(
    @User() requestUser: RequestUser,
  ): Promise<ChauffeurResponseDto[]> {
    return this.fahariPermissionService.runIfSuperAdmin(
      requestUser,
      () => this.userService.listChauffeurs(),
      NotFoundException,
    );
  }
}
