import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class ValidateDeviceCredentialsDto {
  @ApiProperty({
    description: 'Device API key to validate',
    example: 'trk_abc123',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^trk_/)
  apiKey: string;
}
