import {
  Controller,
  Get,
  HttpStatus,
  Logger,
  NotFoundException,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TeammatesService } from '@/teammates/teammates.service';
import { ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { SupabaseAuthGuard } from '@/auth/guard/supabase.guard';
import { TeammateResponseDto } from '@/teammates/dto/teammate-response.dto';
import { User } from '@/auth/decorator/user.decorator';
import RequestUser from '@/auth/domain/request-user';
import NotFoundInDb from '@/common/exceptions/not-found';

@Controller('teammates')
export class TeammatesController {
  logger = new Logger(TeammatesController.name);

  constructor(private readonly teammatesService: TeammatesService) {}

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
    status: HttpStatus.UNAUTHORIZED,
    description: 'User is unauthorized to make this request',
  })
  @UseGuards(SupabaseAuthGuard)
  async getTeammates(
    @Query('workspaceCode') workspaceCode: string,
  ): Promise<TeammateResponseDto[]> {
    return this.teammatesService.getTeammates(workspaceCode);
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
    try {
      return await this.teammatesService.getMyTeammateProfile(
        workspaceCode,
        requestUser.email,
      );
    } catch (error) {
      if (error instanceof NotFoundInDb) {
        throw new NotFoundException();
      }
      throw error;
    }
  }
}
