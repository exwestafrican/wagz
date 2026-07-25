import {
  Body,
  ConflictException,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TrackerService } from '@/tracker/tracker.service';
import { RegisterDeviceDto } from '@/tracker/dto/register-device.dto';
import {
  DeviceResponseDto,
  toDeviceResponse,
} from '@/tracker/dto/device-response.dto';
import ItemAlreadyExistsInDb from '@/common/exceptions/conflict';
import ApiBadRequestResponse from '@/common/decorators/bad-response';
import { SupabaseAuthGuard } from '@/auth/guard/supabase.guard';
import { User } from '@/auth/decorator/user.decorator';
import RequestUser from '@/auth/domain/request-user';
import { PermissionService } from '@/permission/permission.service';
import { ENVOYE_WORKSPACE_CODE } from '@/feature-flag/const';
import { PERMISSIONS } from '@/permission/types';

@Controller('tracker/admin')
export class TrackerAdminController {
  constructor(
    private readonly trackerService: TrackerService,
    private readonly permissionService: PermissionService,
  ) {}

  @Post('devices')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a tracking device' })
  @ApiBody({ type: RegisterDeviceDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Device registered',
    type: DeviceResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Device with this IMEI already exists',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Missing permission or not an active Envoye workspace member',
  })
  @ApiBadRequestResponse()
  @UseGuards(SupabaseAuthGuard)
  async registerDevice(
    @User() requestUser: RequestUser,
    @Body() registerDeviceDto: RegisterDeviceDto,
  ): Promise<DeviceResponseDto> {
    try {
      const device =
        await this.permissionService.runIfActiveWorkspaceMemberAndPermitted(
          requestUser,
          ENVOYE_WORKSPACE_CODE,
          PERMISSIONS.MANAGE_DEVICES,
          () => this.trackerService.registerDevice(registerDeviceDto.imei),
        );
      return toDeviceResponse(device);
    } catch (error) {
      if (error instanceof ItemAlreadyExistsInDb) {
        throw new ConflictException(error.message);
      }
      throw error;
    }
  }
}
