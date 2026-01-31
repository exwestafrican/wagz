import { Body, Controller, HttpStatus, Logger, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import ApiBadRequestResponse from '@/common/decorators/bad-response';
import { AuthController } from '@/auth/auth.controller';
import { WorkspaceManager } from '@/workspace/workspace-manager.service';
import SetupWorkspaceDto from '@/workspace/dto/setup-workspace.dto';
import WorkspaceDetailsResponseDto, {
  toWorkspaceDetailsResponse,
} from '@/workspace/dto/workspace-details-response.dto';

@Controller('workspace')
export class WorkspaceController {
  logger = new Logger(AuthController.name);

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
  @ApiBadRequestResponse()
  //TODO: ensure user is authenticated
  async setup(
    @Body() dto: SetupWorkspaceDto,
  ): Promise<WorkspaceDetailsResponseDto> {
    const workspaceDetails = await this.workspaceManager.setup(dto.id);
    //TODO: ensure that request.user.email is same as preverified.user.email
    return toWorkspaceDetailsResponse(workspaceDetails);
  }
}
