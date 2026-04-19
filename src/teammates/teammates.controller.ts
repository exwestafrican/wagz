import {
  ConflictException,
  Controller,
  Get,
  HttpStatus,
  Logger,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TeammatesService } from '@/teammates/teammates.service';
import { ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { SupabaseAuthGuard } from '@/auth/guard/supabase.guard';
import {
  TeammateResponseDto,
  toTeammateResponse,
} from '@/teammates/dto/teammate-response.dto';
import { User } from '@/auth/decorator/user.decorator';
import RequestUser from '@/auth/domain/request-user';
import { PermissionService } from '@/permission/permission.service';
import { PERMISSIONS } from '@/permission/types';
import { TeammateStatus } from '@/generated/prisma/enums';
import { CheckUsernameQueryDto } from '@/teammates/dto/check-username-query.dto';

@Controller('teammates')
export class TeammatesController {
  logger = new Logger(TeammatesController.name);

  constructor(
    private readonly teammatesService: TeammatesService,
    private readonly permissionService: PermissionService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get teammates' })
  @ApiQuery({
    name: 'workspaceCode',
    required: true,
    type: String,
    description: 'Workspace Code',
    example: '12er56',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Teammates in the workspace',
    type: TeammateResponseDto,
    isArray: true,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User does not have permission to view teammates',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User is unauthorized to make this request',
  })
  @UseGuards(SupabaseAuthGuard)
  async getActiveTeammates(
    @User() requestUser: RequestUser,
    @Query('workspaceCode') workspaceCode: string,
  ): Promise<TeammateResponseDto[]> {
    return await this.permissionService.runIfActiveWorkspaceMember(
      requestUser,
      workspaceCode,
      async () => {
        const teammates = await this.teammatesService.getTeammates(
          workspaceCode,
          TeammateStatus.ACTIVE,
        );
        return teammates.map(toTeammateResponse);
      },
    );
  }

  @Get('me')
  @ApiOperation({ summary: 'Get my teammate profile' })
  @ApiQuery({
    name: 'workspaceCode',
    required: true,
    type: String,
    description: 'Workspace Code',
    example: '12gh56',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'My teammate profile',
    type: TeammateResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Teammate not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User is unauthorized to make this request',
  })
  @UseGuards(SupabaseAuthGuard)
  async getMyTeammateProfile(
    @User() requestUser: RequestUser,
    @Query('workspaceCode') workspaceCode: string,
  ): Promise<TeammateResponseDto> {
    const teammate = await this.teammatesService.getMyTeammateProfile(
      workspaceCode,
      requestUser.email,
    );
    return toTeammateResponse(teammate);
  }

  @Get('check-username')
  @ApiOperation({
    summary: 'Check if a username is already taken in a workspace',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Username is available',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Username is already taken in this workspace',
  })
  async checkIfUsernameExists(
    @Query() query: CheckUsernameQueryDto,
  ): Promise<void> {
    const exists = await this.teammatesService.usernameAlreadyExistsInWorkspace(
      query.workspaceCode,
      query.username,
    );
    if (exists) {
      throw new ConflictException();
    }
  }
}
