import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import FeatureFlagDto, {
  AppDto,
  AppEnrollmentDto,
  CreateFeatureFlagDto,
  DeleteFeatureFlagDto,
  EnableFeatureForAppsDto,
  GetFeatureEnabledAppsQueryDto,
  PatchFeatureFlagStatusDto,
  toAppDto,
  toAppEnrollmentDto,
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
import { WorkspaceManager } from '@/workspace/workspace-manager.service';
import { ImpersonationService } from '@/impersonation/impersonation.service';
import { StartImpersonationDto } from '@/impersonation/dto/start-impersonation.dto';
import {
  ImpersonationSessionDto,
  toImpersonationSessionDto,
} from '@/impersonation/dto/impersonation-session.dto';
import { PrismaService } from '@/prisma/prisma.service';
import { notInDbError } from '@/common/error-type';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly featureFlagManager: FeatureFlagManager,
    private readonly permissionService: PermissionService,
    private readonly workspaceManager: WorkspaceManager,
    private readonly impersonationService: ImpersonationService,
    private readonly prismaService: PrismaService,
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

  @Patch('/feature-flag/:key/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update feature flag rollout status' })
  @ApiParam({
    name: 'key',
    description: 'Key of an existing feature flag',
    example: 'can_use_whatsapp',
  })
  @ApiBody({ type: PatchFeatureFlagStatusDto })
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
    @Param('key') key: string,
    @Body() body: PatchFeatureFlagStatusDto,
  ) {
    try {
      const updated =
        await this.permissionService.runIfActiveWorkspaceMemberAndPermitted(
          requestUser,
          ENVOYE_WORKSPACE_CODE,
          PERMISSIONS.MANAGE_FEATURE_FLAGS,
          () => this.featureFlagManager.setStatus(key, body.status),
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

  @Get('/feature-flag/apps/enrollment')
  @ApiOperation({ summary: 'List all apps with feature enrollment status' })
  @ApiQuery({
    name: 'featureKey',
    description: 'Key of the feature flag',
    example: 'can_use_whatsapp',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'All apps (up to 100) with hasFeature',
    type: [AppEnrollmentDto],
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
  async listAppEnrollment(
    @User() requestUser: RequestUser,
    @Query() query: GetFeatureEnabledAppsQueryDto,
  ): Promise<AppEnrollmentDto[]> {
    try {
      const appEnrollment =
        await this.permissionService.runIfActiveWorkspaceMemberAndPermitted(
          requestUser,
          ENVOYE_WORKSPACE_CODE,
          PERMISSIONS.MANAGE_FEATURE_FLAGS,
          () => this.featureFlagManager.listAppEnrollment(query.featureKey),
        );

      return appEnrollment.map(({ workspace, hasFeature }) =>
        toAppEnrollmentDto(workspace, hasFeature),
      );
    } catch (error) {
      if (error instanceof NotFoundInDb) {
        throw new NotFoundException();
      }
      throw error;
    }
  }

  @Get('/feature-flag/apps')
  @ApiOperation({ summary: 'List apps where a feature flag is enabled' })
  @ApiQuery({
    name: 'featureKey',
    description: 'Key of the feature flag',
    example: 'can_use_whatsapp',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Apps with the feature enabled (up to 100)',
    type: [AppDto],
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
  async getAppsWithFeatureEnabled(
    @User() requestUser: RequestUser,
    @Query() query: GetFeatureEnabledAppsQueryDto,
  ): Promise<AppDto[]> {
    try {
      const workspacesWithFeatureEnabled =
        await this.permissionService.runIfActiveWorkspaceMemberAndPermitted(
          requestUser,
          ENVOYE_WORKSPACE_CODE,
          PERMISSIONS.MANAGE_FEATURE_FLAGS,
          () =>
            this.featureFlagManager.appsWithFeatureEnabled(query.featureKey),
        );

      return workspacesWithFeatureEnabled.map(toAppDto);
    } catch (error) {
      if (error instanceof NotFoundInDb) {
        throw new NotFoundException();
      }
      throw error;
    }
  }

  @Get('/apps')
  @ApiOperation({ summary: 'List all apps' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'All apps (up to 100)',
    type: [AppDto],
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Missing permission or not an active Envoye workspace member',
  })
  @UseGuards(SupabaseAuthGuard)
  async listApps(@User() requestUser: RequestUser): Promise<AppDto[]> {
    const workspaces =
      await this.permissionService.runIfActiveWorkspaceMemberAndPermitted(
        requestUser,
        ENVOYE_WORKSPACE_CODE,
        PERMISSIONS.WORKSPACE,
        () => this.workspaceManager.listApps(),
      );

    return workspaces.map(toAppDto);
  }

  @Post('/impersonate')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Start impersonating a teammate' })
  @ApiBody({ type: StartImpersonationDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Impersonation session started',
    type: ImpersonationSessionDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Missing permission or invalid impersonation target',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Teammate not found',
  })
  @UseGuards(SupabaseAuthGuard)
  async startImpersonation(
    @User() requestUser: RequestUser,
    @Body() body: StartImpersonationDto,
  ): Promise<ImpersonationSessionDto> {
    const { session, subjectTeammate } =
      await this.impersonationService.startSession(
        requestUser.email,
        body.teammateId,
      );

    return toImpersonationSessionDto(session, subjectTeammate);
  }

  @Delete('/impersonate/:sessionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'End an impersonation session' })
  @ApiParam({
    name: 'sessionId',
    description: 'Impersonation session id',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Impersonation session ended',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Session not found',
  })
  @UseGuards(SupabaseAuthGuard)
  async endImpersonation(
    @User() requestUser: RequestUser,
    @Param('sessionId') sessionId: string,
  ): Promise<void> {
    await this.impersonationService.endSession(requestUser.email, sessionId);
  }

  @Get('/impersonate/active')
  @ApiOperation({ summary: 'Get active impersonation session for the actor' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Active impersonation session',
    type: ImpersonationSessionDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'No active impersonation session',
  })
  @UseGuards(SupabaseAuthGuard)
  async getActiveImpersonation(
    @User() requestUser: RequestUser,
  ): Promise<ImpersonationSessionDto> {
    const activeSession = await this.impersonationService.getActiveSession(
      requestUser.email,
    );

    if (!activeSession) {
      throw new NotFoundException();
    }

    try {
      const subjectTeammate =
        await this.prismaService.teammate.findUniqueOrThrow({
          where: { id: activeSession.subjectTeammateId },
        });

      return toImpersonationSessionDto(activeSession, subjectTeammate);
    } catch (error) {
      if (notInDbError(error)) {
        throw new NotFoundException();
      }
      throw error;
    }
  }
}
