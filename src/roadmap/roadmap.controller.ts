import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FeaturesService } from '@/roadmap/service/feature.service';
import { FeatureDto } from '@/roadmap/dto/feature.dto';
import { CreateFeatureRequestDto } from '@/roadmap/dto/create-feature-request.dto';
import VoteFeatureDto from './dto/vote-feature.dto';
import NotFoundInDb from '@/common/exceptions/not-found';

@Controller('roadmap')
@ApiTags('roadmap')
export class RoadmapController {
  logger = new Logger(RoadmapController.name);

  constructor(private readonly featureService: FeaturesService) {}

  @Get('future-features')
  @ApiOperation({ summary: 'Get future features' })
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

  @Post('vote')
  @ApiOperation({ summary: 'Toggle vote for a feature' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Vote toggled successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Feature not found',
  })
  @HttpCode(HttpStatus.OK)
  async toggleVote(@Body() voteFeatureDto: VoteFeatureDto) {
    try {
      return await this.featureService.toggleVote(
        voteFeatureDto.email,
        voteFeatureDto.featureId,
      );
    } catch (error) {
      if (error instanceof NotFoundInDb) {
        throw new NotFoundException(error);
      } else {
        throw error;
      }
    }
  }
}
