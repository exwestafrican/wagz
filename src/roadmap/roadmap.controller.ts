import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FeaturesService } from '@/roadmap/service/feature.service';
import { FeatureDto } from '@/roadmap/dto/feature.dto';
import { CreateFeatureRequestDto } from '@/roadmap/dto/create-feature-request.dto';
import Unauthorized from '@/common/exceptions/unauthorized';

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
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User must be on waitlist to create feature requests',
  })
  @HttpCode(HttpStatus.CREATED)
  async createFeatureRequest(
    @Body() createFeatureRequestDto: CreateFeatureRequestDto,
  ) {
    try {
      this.logger.log(
        `Creating feature request for ${createFeatureRequestDto.email}`,
      );
      return await this.featureService.createFeatureRequest(
        createFeatureRequestDto.email,
        createFeatureRequestDto.description,
        createFeatureRequestDto.priority,
      );
    } catch (error) {
      if (error instanceof Unauthorized) {
        throw new UnauthorizedException(error.message);
      }
      throw error;
    }
  }
}
