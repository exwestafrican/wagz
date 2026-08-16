import {
  Body,
  ConflictException,
  Controller,
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
import { RotateDeviceApiKeyDto } from '@/tracker/dto/rotate-device-api-key.dto';
import {
  DeviceResponseDto,
  RegisteredDeviceResponseDto,
  toDeviceResponse,
  toRegisteredDeviceResponse,
} from '@/tracker/dto/device-response.dto';
import ItemAlreadyExistsInDb from '@/common/exceptions/conflict';
import NotFoundInDb from '@/common/exceptions/not-found';
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
    const devices =
      await this.permissionService.runIfActiveWorkspaceMemberAndPermitted(
        requestUser,
        ENVOYE_WORKSPACE_CODE,
        PERMISSIONS.MANAGE_DEVICES,
        () => this.trackerService.listDevices(),
        NotFoundException,
      );
    return devices.map(toDeviceResponse);
  }

  @Post('devices')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a tracking device' })
  @ApiBody({ type: RegisterDeviceDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Device registered with a one-time API key',
    type: RegisteredDeviceResponseDto,
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
  ): Promise<RegisteredDeviceResponseDto> {
    try {
      const registeredDevice =
        await this.permissionService.runIfActiveWorkspaceMemberAndPermitted(
          requestUser,
          ENVOYE_WORKSPACE_CODE,
          PERMISSIONS.MANAGE_DEVICES,
          () => this.trackerService.registerDevice(registerDeviceDto.imei),
        );
      return toRegisteredDeviceResponse(
        registeredDevice.device,
        registeredDevice.apiKey,
      );
    } catch (error) {
      if (error instanceof ItemAlreadyExistsInDb) {
        throw new ConflictException(error.message);
      }
      throw error;
    }
  }

  @Post('devices/rotate-key')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Rotate API key for a tracking device' })
  @ApiBody({ type: RotateDeviceApiKeyDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'New one-time API key issued; previous keys are revoked',
    type: RegisteredDeviceResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Device not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Missing permission or not an active Envoye workspace member',
  })
  @ApiBadRequestResponse()
  @UseGuards(SupabaseAuthGuard)
  async rotateDeviceApiKey(
    @User() requestUser: RequestUser,
    @Body() rotateDeviceApiKeyDto: RotateDeviceApiKeyDto,
  ): Promise<RegisteredDeviceResponseDto> {
    try {
      const registeredDevice =
        await this.permissionService.runIfActiveWorkspaceMemberAndPermitted(
          requestUser,
          ENVOYE_WORKSPACE_CODE,
          PERMISSIONS.MANAGE_DEVICES,
          () =>
            this.trackerService.rotateDeviceApiKey(
              rotateDeviceApiKeyDto.deviceId,
            ),
        );
      return toRegisteredDeviceResponse(
        registeredDevice.device,
        registeredDevice.apiKey,
      );
    } catch (error) {
      if (error instanceof NotFoundInDb) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }
}
