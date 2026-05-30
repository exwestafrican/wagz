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
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import FeatureFlagDto, {
  CreateFeatureFlagDto,
  DeleteFeatureFlagDto,
  EnableFeatureForAppsDto,
  UpdateFeatureFlagStatusDto,
  toFeatureFlagDto,
} from '@/admin/dto/feature-flag.dto';
import { SupabaseAuthGuard } from '@/auth/guard/supabase.guard';
import { User } from '@/auth/decorator/user.decorator';
import RequestUser from '@/auth/domain/request-user';
import FeatureFlagManager from '@/feature-flag/manager';
import { PermissionService } from '@/permission/permission.service';
import { ENVOYE_WORKSPACE_CODE } from '@/feature-flag/const';
import { PERMISSIONS } from '@/permission/types';
import NotFoundInDb from '@/common/exceptions/not-found';

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
        PERMISSIONS.MANAGE_FEATURE_FLAGS,
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
        PERMISSIONS.MANAGE_FEATURE_FLAGS,
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

  @Post('/feature-flag/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update feature flag rollout status' })
  @ApiBody({ type: UpdateFeatureFlagStatusDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Feature flag status updated',
    type: FeatureFlagDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Missing permission or not an active Envoye workspace member',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Feature flag not found',
  })
  @UseGuards(SupabaseAuthGuard)
  async updateFeatureFlagStatus(
    @User() requestUser: RequestUser,
    @Body() body: UpdateFeatureFlagStatusDto,
  ) {
    try {
      const updated =
        await this.permissionService.runIfActiveWorkspaceMemberAndPermitted(
          requestUser,
          ENVOYE_WORKSPACE_CODE,
          PERMISSIONS.MANAGE_FEATURE_FLAGS,
          () => this.featureFlagManager.setStatus(body.key, body.status),
        );

      return toFeatureFlagDto(updated);
    } catch (error) {
      if (error instanceof NotFoundInDb) {
        throw new NotFoundException();
      }
      throw error;
    }
  }

  @Post('/feature-flag/delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a feature flag' })
  @ApiBody({ type: DeleteFeatureFlagDto })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Feature flag deleted',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Missing permission or not an active Envoye workspace member',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Feature flag not found',
  })
  @UseGuards(SupabaseAuthGuard)
  async deleteFeatureFlag(
    @User() requestUser: RequestUser,
    @Body() body: DeleteFeatureFlagDto,
  ): Promise<void> {
    try {
      await this.permissionService.runIfActiveWorkspaceMemberAndPermitted(
        requestUser,
        ENVOYE_WORKSPACE_CODE,
        PERMISSIONS.MANAGE_FEATURE_FLAGS,
        () => this.featureFlagManager.delete(body.key),
      );
    } catch (error) {
      if (error instanceof NotFoundInDb) {
        throw new NotFoundException();
      }
      throw error;
    }
  }

  @Post('/feature-flag/enable-apps')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enable a feature flag for apps' })
  @ApiBody({ type: EnableFeatureForAppsDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Feature enabled for apps',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Flag not PARTIAL or unknown app code(s)',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Missing permission or not an active Envoye workspace member',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Feature flag not found',
  })
  @UseGuards(SupabaseAuthGuard)
  async enableFeatureForApps(
    @User() requestUser: RequestUser,
    @Body() body: EnableFeatureForAppsDto,
  ): Promise<void> {
    try {
      await this.permissionService.runIfActiveWorkspaceMemberAndPermitted(
        requestUser,
        ENVOYE_WORKSPACE_CODE,
        PERMISSIONS.MANAGE_FEATURE_FLAGS,
        () => this.featureFlagManager.enableFFForApps(body.key, body.appCodes),
      );
    } catch (error) {
      if (error instanceof NotFoundInDb) {
        throw new NotFoundException();
      }
      throw error;
    }
  }
}
