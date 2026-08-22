import { ApiProperty } from '@nestjs/swagger';
import { Device } from '@/generated/prisma/client';

export class DeviceResponseDto {
  @ApiProperty({ description: 'Device id' })
  id: string;

  @ApiProperty({ description: 'Device IMEI' })
  imei: string;

  @ApiProperty({ description: 'When the device was registered' })
  createdAt: Date;
}

export function toDeviceResponse(device: Device): DeviceResponseDto {
  return {
    id: device.id,
    imei: device.imei,
    createdAt: device.createdAt,
  };
}

export class RegisteredDeviceResponseDto extends DeviceResponseDto {
  @ApiProperty({
    description:
      'One-time device API key. Provision onto the Android device; it is never returned again.',
  })
  apiKey: string;
}

export function toRegisteredDeviceResponse(
  device: Device,
  apiKey: string,
): RegisteredDeviceResponseDto {
  return {
    ...toDeviceResponse(device),
    apiKey,
  };
}
