import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RotateDeviceApiKeyDto {
  @ApiProperty({
    description: 'Registered device id',
    example: 'clxyz123abc',
  })
  @IsString()
  @IsNotEmpty()
  deviceId: string;
}
