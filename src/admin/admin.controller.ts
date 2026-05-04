import { Controller, Get, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import FeatureFlagDto, { toFeatureFlagDto } from '@/admin/dto/feature-flag.dto';
import { SupabaseAuthGuard } from '@/auth/guard/supabase.guard';
import { User } from '@/auth/decorator/user.decorator';
import RequestUser from '@/auth/domain/request-user';
import FeatureFlagManager from '@/feature-flag/manager';
import { PermissionService } from '@/permission/permission.service';
import { ENVOYE_WORKSPACE_CODE } from '@/feature-flag/const';
import { PERMISSIONS } from '@/permission/types';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly featureFlagManager: FeatureFlagManager,
    private readonly permissionService: PermissionService,
  ) {}
  @Get('/feature-flag')
  @ApiOperation({ summary: 'Get all features' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'All features returns',
    type: Array<FeatureFlagDto>,
  })
  @UseGuards(SupabaseAuthGuard) // create admin guard
  async listFeatureFlags(@User() requestUser: RequestUser) {
    const featureFlags =
      await this.permissionService.runIfActiveWorkspaceMemberAndPermitted(
        requestUser,
        ENVOYE_WORKSPACE_CODE,
        PERMISSIONS.VIEW_ALL_FEATURE_FLAGS,
        () => this.featureFlagManager.listAll(),
      );

    return featureFlags.map((ff) => toFeatureFlagDto(ff));
  }
}
