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
import { TrackerService } from '@/fahari/tracker/tracker.service';
import { RecordLocationsDto } from '@/fahari/tracker/dto/record-location.dto';
import { RecordLocationsResponseDto } from '@/fahari/tracker/dto/record-locations-response.dto';
import ApiBadRequestResponse from '@/common/decorators/bad-response';
import { DeviceAuthGuard } from '@/fahari/auth/guard/device-auth.guard';
import { AuthenticatedDevice } from '@/fahari/tracker/decorator/device.decorator';

import { ValidateDeviceCredentialsDto } from '@/fahari/tracker/dto/validate-device-credentials.dto';
import { ValidateDeviceCredentialsResponseDto } from '@/fahari/tracker/dto/validate-device-credentials-response.dto';

@Controller('tracker')
export class TrackerController {
  constructor(private readonly trackerService: TrackerService) {}

  @Post('validate-credentials')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate a device API key' })
  @ApiBody({ type: ValidateDeviceCredentialsDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Device API key is valid and active',
    type: ValidateDeviceCredentialsResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or inactive device API key',
  })
  @ApiBadRequestResponse()
  async validateCredentials(
    @Body() validateDeviceCredentialsDto: ValidateDeviceCredentialsDto,
  ): Promise<ValidateDeviceCredentialsResponseDto> {
    await this.trackerService.validateDeviceApiKey(
      validateDeviceCredentialsDto.apiKey,
    );
    return { valid: true };
  }

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
