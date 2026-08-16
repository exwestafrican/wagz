import { User } from '@/auth/decorator/user.decorator';
import RequestUser from '@/auth/domain/request-user';
import { SupabaseAuthGuard } from '@/auth/guard/supabase.guard';
import {
  Controller,
  Get,
  HttpStatus,
  Logger,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PermissionService } from './permission.service';

@Controller('permission')
export class PermissionController {
  logger = new Logger(PermissionController.name);

  constructor(private readonly permissionService: PermissionService) {}

  @Get('')
  @ApiOperation({ summary: 'Get teammates permissions' })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @UseGuards(SupabaseAuthGuard)
  async getPermissions(
    @User() requestUser: RequestUser,
    @Query('workspaceCode') workspaceCode: string,
  ): Promise<string[]> {
    return this.permissionService.teammatePermissions(
      requestUser.email,
      workspaceCode,
    );
  }
}
