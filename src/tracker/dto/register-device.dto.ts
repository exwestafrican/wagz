import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RegisterDeviceDto {
  @ApiProperty({
    description: 'Unique IMEI of the device',
    example: '356938035643809',
  })
  @IsString()
  @IsNotEmpty()
  imei: string;
}
