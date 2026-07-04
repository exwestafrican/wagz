import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Logger,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { render } from '@react-email/render';
import React from 'react';
import { SupabaseAuthGuard } from '@/auth/guard/supabase.guard';
import type BackfillTask from '@/backfill/task';
import BackfillResponseDto, {
  toBackfillResponseDto,
} from '@/backfill/dto/backfill-response.dto';
import BackfillRunResponseDto, {
  toBackfillRunResponseDto,
} from '@/backfill/dto/backfill-run-response.dto';
import {
  BACKFILL_REGISTRY,
  type Registry,
} from '@/backfill/backfill-registry.provider';
import { PermissionService } from '@/permission/permission.service';
import { PrismaService } from '@/prisma/prisma.service';
import { EMAIL_CLIENT, type EmailClient } from '@/messaging/email/email-client';
import { BackfillCompleteTemplate } from '@/emails/templates/backfill-complete-template';
import { User } from '@/auth/decorator/user.decorator';
import RequestUser from '@/auth/domain/request-user';
import { PERMISSIONS } from '@/permission/types';
import { ENVOYE_WORKSPACE_CODE } from '@/feature-flag/const';
import buildJobRunSummary, { JobRunSummary } from '@/backfill/utils';
import { TeammatesService } from '@/teammates/teammates.service';
import { Teammate } from '@/generated/prisma/client';
import { fullName } from '@/teammates/utils/full-name';

@Controller('backfill')
export class BackfillController {
  logger = new Logger(BackfillController.name);
  constructor(
    @Inject(BACKFILL_REGISTRY) private readonly registry: Registry,
    private readonly permissionService: PermissionService,
    private readonly prismaService: PrismaService,
    private readonly teammateService: TeammatesService,
    @Inject(EMAIL_CLIENT) private readonly emailClient: EmailClient,
  ) {}

  @Get('tasks')
  @ApiOperation({ summary: 'Get all backfill jobs' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'All jobs returns',
    type: Array<BackfillResponseDto>,
  })
  @UseGuards(SupabaseAuthGuard)
  async list(@User() requestUser: RequestUser): Promise<BackfillResponseDto[]> {
    return await this.permissionService.runIfPermitted(
      requestUser,
      ENVOYE_WORKSPACE_CODE,
      PERMISSIONS.VIEW_BACKFILL_TASK,
      () => this.registry.all().map((r) => toBackfillResponseDto(r)),
    );
  }

  @Post('tasks/:jobId/run')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Run a backfill job against all workspaces' })
  @ApiParam({ name: 'jobId', example: 'normalize_usernames' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Run summary',
    type: BackfillRunResponseDto,
  })
  @UseGuards(SupabaseAuthGuard)
  async run(
    @User() requestUser: RequestUser,
    @Param('jobId') jobId: string,
  ): Promise<BackfillRunResponseDto> {
    return await this.permissionService.runIfPermitted(
      requestUser,
      ENVOYE_WORKSPACE_CODE,
      PERMISSIONS.RUN_BACKFILL_TASK,
      async () => {
        let task: BackfillTask;
        try {
          task = this.registry.get(jobId);
        } catch {
          throw new NotFoundException(`Unknown backfill job: ${jobId}`);
        }

        const workspaces = await this.prismaService.workspace.findMany({
          orderBy: { id: 'asc' },
        });

        const failedWorkspaceCodes: string[] = [];
        for (const workspace of workspaces) {
          try {
            await task.run(workspace);
          } catch (error) {
            failedWorkspaceCodes.push(workspace.code);
            this.logger.error(
              `Backfill job failed; jobId=${jobId} workspaceCode=${workspace.code}`,
              error,
            );
          }
        }

        const jobSummary = buildJobRunSummary(
          jobId,
          workspaces,
          failedWorkspaceCodes.length,
        );

        if (jobSummary.failed > 0) {
          this.logger.error(
            `Backfill job completed with failures; jobId=${jobId} failedWorkspaceCodes=[${failedWorkspaceCodes.join(', ')}]`,
          );
        }

        const teammate = await this.teammateService.getMyTeammateProfile(
          ENVOYE_WORKSPACE_CODE,
          requestUser.email,
        );
        await this.sendCompletionEmail(teammate, jobSummary);
        return toBackfillRunResponseDto(jobSummary);
      },
    );
  }

  private async sendCompletionEmail(
    teammate: Teammate,
    jobSummary: JobRunSummary,
  ): Promise<void> {
    try {
      const html = await render(
        React.createElement(BackfillCompleteTemplate, jobSummary),
      );
      await this.emailClient.send({
        from: { email: 'admin@envoye.com', name: 'Admin' },
        to: { email: teammate.email, name: fullName(teammate) },
        subject: `[${jobSummary.jobId}] Backfill Run Summary`,
        html,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send backfill completion email; jobId=${jobSummary.jobId} to=${teammate.id}`,
        error,
      );
    }
  }
}
