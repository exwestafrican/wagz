import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { UploadSubdirectory } from '@/storage/image-store';

export class UploadImageDto {
  @ApiProperty({
    description: 'Subdirectory that receives the image',
    enum: UploadSubdirectory,
    example: UploadSubdirectory.INVOICES,
  })
  @IsEnum(UploadSubdirectory)
  subdirectory: UploadSubdirectory;
}
