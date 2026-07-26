import {
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
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

@Controller('admin/tracker')
export class TrackerAdminController {
  constructor(
    private readonly trackerService: TrackerService,
    private readonly permissionService: PermissionService,
  ) {}

  @Get('devices')
  @ApiOperation({ summary: 'List all tracking devices' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'All devices returned',
    type: [DeviceResponseDto],
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Missing permission or not an active Envoye workspace member',
  })
  @UseGuards(SupabaseAuthGuard)
  async listDevices(
    @User() requestUser: RequestUser,
  ): Promise<DeviceResponseDto[]> {
    try {
      const devices =
        await this.permissionService.runIfActiveWorkspaceMemberAndPermitted(
          requestUser,
          ENVOYE_WORKSPACE_CODE,
          PERMISSIONS.MANAGE_DEVICES,
          () => this.trackerService.listDevices(),
        );
      return devices.map(toDeviceResponse);
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw new NotFoundException();
      }
      throw error;
    }
  }

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
