import {
  Body,
  NotFoundException,
  ConflictException,
  Controller,
  HttpStatus,
  Logger,
  Post,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import ApiBadRequestResponse from '@/common/decorators/bad-response';
import { WorkspaceManager } from '@/workspace/workspace-manager.service';
import SetupWorkspaceDto from '@/workspace/dto/setup-workspace.dto';
import InviteTeammatesDto from '@/workspace/dto/invite-teammates.dto';
import WorkspaceDetailsResponseDto, {
  toWorkspaceDetailsResponse,
} from '@/workspace/dto/workspace-details-response.dto';
import { SupabaseAuthGuard } from '@/auth/guard/supabase.guard';
import { User } from '@/auth/decorator/user.decorator';
import RequestUser from '@/auth/domain/request-user';
import { InvalidState } from '@/common/exceptions/invalid-state';
import NotFoundInDb from '@/common/exceptions/not-found';

@Controller('workspace')
export class WorkspaceController {
  logger = new Logger(WorkspaceController.name);

  constructor(private readonly workspaceManager: WorkspaceManager) {}

  @Post('/setup')
  @ApiOperation({ summary: 'Setup workspace and workspace dependencies' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Workspace and dependencies have been created',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authorized to setup',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Preverification not found or auth user is not the owner',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Preverification already verified or invalid state',
  })
  @ApiBadRequestResponse()
  @UseGuards(SupabaseAuthGuard)
  async setup(
    @User() requestUser: RequestUser,
    @Body() dto: SetupWorkspaceDto,
  ): Promise<WorkspaceDetailsResponseDto> {
    try {
      const workspaceDetails = await this.workspaceManager.setup(
        requestUser.email,
        dto.id,
      );
      return toWorkspaceDetailsResponse(workspaceDetails);
    } catch (error) {
      if (error instanceof InvalidState) {
        throw new ConflictException();
      } else if (error instanceof NotFoundInDb) {
        throw new NotFoundException();
      }
      throw error;
    }
  }

  @Post('/invite-teammates')
  @ApiOperation({ summary: 'Invite teammates by email' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Request accepted (no-op for now)',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authorized',
  })
  @ApiBadRequestResponse()
  @UseGuards(SupabaseAuthGuard)
  @HttpCode(HttpStatus.OK)
  inviteTeammates(
    @User() requestUser: RequestUser,
    @Body() dto: InviteTeammatesDto,
  ) {
    // No-op: invite flow to be implemented
    return {
      user: requestUser.email,
      emails: dto.emails,
    };
  }
}
