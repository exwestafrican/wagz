import { ApiProperty } from '@nestjs/swagger';

export class PermissionResponseDto {
  @ApiProperty({ description: 'permission name' })
  name: string;

  @ApiProperty({ description: 'what the permission gives access to' })
  description: string;

  @ApiProperty({ description: 'description code' })
  code: string;
}
