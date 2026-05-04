import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import FeatureFlagDto, {
  CreateFeatureFlagDto,
  toFeatureFlagDto,
} from '@/admin/dto/feature-flag.dto';
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

  @Post('/feature-flag')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a feature flag' })
  @ApiBody({ type: CreateFeatureFlagDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Feature flag created',
    type: FeatureFlagDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'A feature flag with this key already exists',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Missing permission or not an active Envoye workspace member',
  })
  @UseGuards(SupabaseAuthGuard)
  async createFeatureFlag(
    @User() requestUser: RequestUser,
    @Body() body: CreateFeatureFlagDto,
  ) {
    const created =
      await this.permissionService.runIfActiveWorkspaceMemberAndPermitted(
        requestUser,
        ENVOYE_WORKSPACE_CODE,
        PERMISSIONS.CREATE_FEATURE_FLAG,
        () =>
          this.featureFlagManager.create(
            body.key,
            body.name,
            body.description,
            requestUser.email,
          ),
      );

    return toFeatureFlagDto(created);
  }
}
