import {
  Body,
  NotFoundException,
  ConflictException,
  Controller,
  HttpStatus,
  Logger,
  Post,
  UseGuards,
  Get,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import ApiBadRequestResponse from '@/common/decorators/bad-response';
import { WorkspaceManager } from '@/workspace/workspace-manager.service';
import SetupWorkspaceDto from '@/workspace/dto/setup-workspace.dto';
import WorkspaceDetailsResponseDto, {
  toWorkspaceDetailsResponse,
} from '@/workspace/dto/workspace-details-response.dto';
import { SupabaseAuthGuard } from '@/auth/guard/supabase.guard';
import { User } from '@/auth/decorator/user.decorator';
import RequestUser from '@/auth/domain/request-user';
import { InvalidState } from '@/common/exceptions/invalid-state';
import NotFoundInDb from '@/common/exceptions/not-found';
import TeammateResponseDto, {
  toTeammatesResponse,
} from './dto/teammate-response.dto';
import { PermissionResponseDto } from './dto/permissions-response.dto';

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

  @Get(':workspaceCode/teammates') //why do we need :workspace
  @UseGuards(SupabaseAuthGuard)
  @ApiOperation({ summary: 'Get all teammates in a workspace' })
  @ApiResponse({ status: HttpStatus.OK, type: [TeammateResponseDto] })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User is not a member of this workspace',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User is not authorized to view all teammates',
  })
  async getTeammates(
    @User() requestUser: RequestUser,
    @Param('workspaceCode') workspaceCode: string,
  ): Promise<TeammateResponseDto[]> {
    try {
      const teammates = await this.workspaceManager.getTeammates(
        workspaceCode,
        requestUser.email,
      );
      return teammates.map(toTeammatesResponse); //the await here is it correct?
    } catch (error) {
      if (error instanceof NotFoundInDb) {
        throw new NotFoundException();
      }
      throw error;
    }
  }

  @Get(':workspaceCode/teammates/:id')
  @UseGuards(SupabaseAuthGuard)
  @ApiOperation({ summary: 'Get a particular teammate in a workspace' })
  @ApiResponse({ status: HttpStatus.OK, type: [TeammateResponseDto] })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User is not a member of this workspace',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User is not authorized to view teammate details',
  })
  async getTeammate(
    @User() requestUser: RequestUser,
    @Param('workspaceCode') workspaceCode: string,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<TeammateResponseDto> {
    try {
      const teammate = await this.workspaceManager.getTeammate(
        workspaceCode,
        requestUser.email,
        id,
      );
      return toTeammatesResponse(teammate);
    } catch (error) {
      if (error instanceof NotFoundInDb) {
        throw new NotFoundException();
      }
      throw error;
    }
  }

  @Get(':workspaceCode/permissions')
  @UseGuards(SupabaseAuthGuard)
  @ApiOperation({
    summary: "Get the request user's permission in a workspace ",
  })
  @ApiResponse({ status: HttpStatus.OK, type: [PermissionResponseDto] })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User is not a member of this workspace',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User is not authorized to view teammate details',
  })
  async getPermissions(
    @User() requestUser: RequestUser,
    @Param('workspaceCode') workspaceCode: string,
  ): Promise<PermissionResponseDto[]> {
    try {
      const permissions = await this.workspaceManager.getPermissions(
        workspaceCode,
        requestUser.email,
      );
      return permissions;
    } catch (error) {
      if (error instanceof NotFoundInDb) {
        throw new NotFoundException();
      }
      throw error;
    }
  }
}
