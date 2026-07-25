import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, Max, Min } from 'class-validator';

export class RecordLocationDto {
  @ApiProperty({
    description: 'Registered device id',
    example: 'clxyz123abc',
  })
  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @ApiProperty({
    description: 'Latitude in decimal degrees',
    example: 6.5244,
  })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({
    description: 'Longitude in decimal degrees',
    example: 3.3792,
  })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;
}
