import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { activeFeatureNames } from '@/fahari/permission/feature-flag';

@Controller('fahari/permissions')
@ApiTags('fahari-permissions')
export class PermissionController {
  @Get('features')
  @ApiOperation({ summary: 'List active Fahari features' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Names of features currently active',
    type: String,
    isArray: true,
  })
  @HttpCode(HttpStatus.OK)
  listFeatures(): string[] {
    return activeFeatureNames();
  }
}
