import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TrackerService } from '@/tracker/tracker.service';
import { RecordLocationDto } from '@/tracker/dto/record-location.dto';
import {
  LocationResponseDto,
  toLocationResponse,
} from '@/tracker/dto/location-response.dto';
import NotFoundInDb from '@/common/exceptions/not-found';
import ApiBadRequestResponse from '@/common/decorators/bad-response';

@Controller('tracker')
export class TrackerController {
  constructor(private readonly trackerService: TrackerService) {}

  @Post('locations')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record a device location ping' })
  @ApiBody({ type: RecordLocationDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Location recorded',
    type: LocationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Device not found',
  })
  @ApiBadRequestResponse()
  async recordLocation(
    @Body() recordLocationDto: RecordLocationDto,
  ): Promise<LocationResponseDto> {
    try {
      const location = await this.trackerService.recordLocation(
        recordLocationDto.deviceId,
        recordLocationDto.latitude,
        recordLocationDto.longitude,
      );
      return toLocationResponse(location);
    } catch (error) {
      if (error instanceof NotFoundInDb) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }
}
