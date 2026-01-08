import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FeaturesService } from '@/roadmap/service/feature.service';
import { FeatureDto } from '@/roadmap/dto/feature.dto';
import { CreateFeatureRequestDto } from '@/roadmap/dto/create-feature-request.dto';
import VoteFeatureDto from './dto/vote-feature.dto';
import GetUserVotesDto from './dto/get-user-votes.dto';
import { UserVotesResponseDto } from './dto/user-votes-response.dto';
import { FutureFeatureResponseDto } from './dto/future-features-response.dto';
import { toFutureFeatureResponseDto } from './mappers/feature.mapper';
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
    type: FutureFeatureResponseDto,
    isArray: true,
  })
  @HttpCode(200)
  async getFutureFeatures(): Promise<FutureFeatureResponseDto[]> {
    this.logger.log('Getting future features');
    const features = await this.featureService.futureFeatures();
    return features.map(toFutureFeatureResponseDto);
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
  async toggleVote(@Body() voteFeatureDto: VoteFeatureDto): Promise<void> {
    try {
      await this.featureService.toggleVote(
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

  @Get('user-votes')
  @ApiOperation({
    summary: 'Get list of feature IDs that a user has voted for',
  })
  @ApiQuery({
    name: 'email',
    required: true,
    type: String,
    description: 'Email of the user to get votes for',
    example: 'user@example.com',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of feature IDs that the user has voted for',
    type: UserVotesResponseDto,
  })
  @HttpCode(HttpStatus.OK)
  async getUserVotes(@Query() getUserVotesDto: GetUserVotesDto) {
    this.logger.log(`Getting votes for user`);
    const featureIds = await this.featureService.getUserVotes(
      getUserVotesDto.email,
    );
    return { featureIds };
  }
}
