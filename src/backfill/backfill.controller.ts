import {
  Controller,
  Get,
  HttpStatus,
  Inject,
  Logger,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SupabaseAuthGuard } from '@/auth/guard/supabase.guard';
import BackfillResponseDto, {
  toBackfillResponseDto,
} from '@/backfill/dto/backfill-response.dto';
import {
  BACKFILL_REGISTRY,
  type Registry,
} from '@/backfill/backfill-registry.provider';
import { PermissionService } from '@/permission/permission.service';
import { User } from '@/auth/decorator/user.decorator';
import RequestUser from '@/auth/domain/request-user';
import { PERMISSIONS } from '@/permission/types';

@Controller('backfill')
export class BackfillController {
  logger = new Logger(BackfillController.name);
  constructor(
    @Inject(BACKFILL_REGISTRY) private readonly registry: Registry,
    private readonly permissionService: PermissionService,
  ) {}

  @Get('tasks')
  @ApiOperation({ summary: 'Get all backfill jobs' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'All jobs returns',
    type: Array<BackfillResponseDto>,
  })
  @UseGuards(SupabaseAuthGuard)
  async list(
    @User() requestUser: RequestUser,
    @Query('workspaceCode') workspaceCode: string,
  ): Promise<BackfillResponseDto[]> {
    //Check if feature enabled for workspace
    //feature available for workspace and admin has permission
    return await this.permissionService.runIfActiveWorkspaceMemberAndPermitted(
      requestUser,
      workspaceCode,
      PERMISSIONS.VIEW_BACKFILL_TASK,
      () => this.registry.all().map((r) => toBackfillResponseDto(r)),
    );
  }
}
