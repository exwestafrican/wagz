import { Controller, Get, HttpCode, Logger } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FeatureDto } from './dto/featureDto';
import { FeaturesService } from './service/features.service';

@Controller('roadmap')
@ApiTags('roadmap')
export class RoadmapController {
  logger = new Logger(RoadmapController.name);

  constructor(private readonly featureService: FeaturesService) {}

  @Get('future-features')
  @ApiOperation({ summary: 'Allow user to authenticate with a magic link' })
  @ApiResponse({
    status: 200,
    description: 'List of features planned and in progress',
    type: FeatureDto,
    isArray: true,
  })
  @HttpCode(200)
  getFeatureFeatures() {
    return this.featureService.featureFeatures();
  }
}
