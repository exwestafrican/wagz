import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FeatureFlagService } from './feature-flag.service';
import ApiBadRequestResponse from '@/common/decorators/bad-response';
import { SupabaseAuthGuard } from '@/auth/guard/supabase.guard';

@Controller('feature-flags')
@ApiTags('feature-flag')
export class FeatureFlagController {
  constructor(private readonly featureFlagService: FeatureFlagService) {}

  @Get('enabled')
  @ApiOperation({ summary: 'Fetch enabled features for the workspace' })
  @ApiQuery({
    name: 'workspaceCode',
    required: true,
    type: String,
    description: 'Code of the workspace to get list of enabled features for',
    example: 'ab34c67',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of features enabled for this workspace',
    type: String,
    isArray: true,
  })
  @ApiBadRequestResponse()
  @UseGuards(SupabaseAuthGuard)
  @HttpCode(HttpStatus.OK)
  getEnabledFeatures(@Query('workspaceCode') workspaceCode: string): string[] {
    return this.featureFlagService.enabledFeatures(workspaceCode);
  }
}
