import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FeaturesService } from '@/roadmap/service/feature.service';
import { FeatureDto } from '@/roadmap/dto/feature.dto';
import { CreateFeatureRequestDto } from '@/roadmap/dto/create-feature-request.dto';

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
  getFutureFeatures() {
    this.logger.log('Getting future features');
    return this.featureService.futureFeatures();
  }

  @Post('feature-request')
  @ApiOperation({ summary: 'Create a new feature request' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Feature request created successfully',
  })
  @HttpCode(HttpStatus.CREATED)
  async createFeatureRequest(
    @Body() createFeatureRequestDto: CreateFeatureRequestDto,
  ) {
    this.logger.log(
      `Creating feature request for ${createFeatureRequestDto.email}`,
    );
    await this.featureService.createFeatureRequest(
      createFeatureRequestDto.email,
      createFeatureRequestDto.description,
      createFeatureRequestDto.priority,
    );
  }
}
