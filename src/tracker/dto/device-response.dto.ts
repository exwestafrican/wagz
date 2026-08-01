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
