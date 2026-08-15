import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Device } from '@/generated/prisma/client';
import { TrackerService } from '@/tracker/tracker.service';
import { RecordLocationsDto } from '@/tracker/dto/record-location.dto';
import { RecordLocationsResponseDto } from '@/tracker/dto/record-locations-response.dto';
import ApiBadRequestResponse from '@/common/decorators/bad-response';
import { DeviceAuthGuard } from '@/tracker/guard/device-auth.guard';
import { AuthenticatedDevice } from '@/tracker/decorator/device.decorator';

@Controller('tracker')
export class TrackerController {
  constructor(private readonly trackerService: TrackerService) {}

  @Post('locations')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(DeviceAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Record a batch of location pings for the authenticated device',
  })
  @ApiBody({ type: RecordLocationsDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Locations recorded',
    type: RecordLocationsResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Missing, invalid, or inactive device API key',
  })
  @ApiBadRequestResponse()
  async recordLocations(
    @AuthenticatedDevice() device: Device,
    @Body() recordLocationsDto: RecordLocationsDto,
  ): Promise<RecordLocationsResponseDto> {
    return this.trackerService.recordLocations(
      device.id,
      recordLocationsDto.locations,
    );
  }
}
