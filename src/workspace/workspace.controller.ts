import {
  Body,
  NotFoundException,
  ConflictException,
  Controller,
  Get,
  HttpStatus,
  Logger,
  Post,
  Query,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import ApiBadRequestResponse from '@/common/decorators/bad-response';
import { WorkspaceManager } from '@/workspace/workspace-manager.service';
import SetupWorkspaceDto from '@/workspace/dto/setup-workspace.dto';
import InviteTeammatesDto from '@/workspace/dto/invite-teammates.dto';
import WorkspaceDetailsResponseDto, {
  toWorkspaceDetailsResponse,
} from '@/workspace/dto/workspace-details-response.dto';
import WorkspaceResponseDto from '@/workspace/dto/workspace-response.dto';
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

  @Get()
  @ApiOperation({ summary: 'Get workspace details by code' })
  @ApiQuery({
    name: 'code',
    required: true,
    type: String,
    description: 'Workspace invite code',
    example: 't8tmd7',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Workspace details',
    type: WorkspaceResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Workspace not found',
  })
  @UseGuards(SupabaseAuthGuard)
  async getByCode(@Query('code') code: string): Promise<WorkspaceResponseDto> {
    try {
      return await this.workspaceManager.details(code);
    } catch (error) {
      if (error instanceof NotFoundInDb) {
        throw new NotFoundException();
      }
      throw error;
    }
  }

  @Post('/invite-teammates')
  @ApiOperation({ summary: 'Invite teammates by email' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Workspace teammate invites processed',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authorized',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Auth user teammate record not found',
  })
  @ApiBadRequestResponse()
  @UseGuards(SupabaseAuthGuard)
  @HttpCode(HttpStatus.OK)
  async inviteTeammates(
    @User() requestUser: RequestUser,
    @Body() dto: InviteTeammatesDto,
  ) {
    try {
      //TODO: do some enforcement before calling
      await this.workspaceManager.inviteEligibleTeammates(
        requestUser.email,
        dto.workspaceCode,
        dto.emails,
        dto.role,
      );
    } catch (error) {
      if (error instanceof NotFoundInDb) {
        throw new NotFoundException();
      }
      throw error;
    }
  }
}
