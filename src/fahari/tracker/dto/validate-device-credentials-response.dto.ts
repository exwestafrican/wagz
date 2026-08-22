import { ApiProperty } from '@nestjs/swagger';

export class ValidateDeviceCredentialsResponseDto {
  @ApiProperty({ description: 'Whether the device API key is valid and active' })
  valid: true;
}
