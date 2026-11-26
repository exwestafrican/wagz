import { ApiProperty } from '@nestjs/swagger';

export class UploadedImageResponseDto {
  @ApiProperty({ description: 'Id of the stored image' })
  uuid: string;

  @ApiProperty({ description: 'Stored image path' })
  path: string;
}
