import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import {
  UPLOAD_SUBDIRECTORY_NAMES,
  type UploadSubdirectoryName,
} from '@/storage/image-store';

export class UploadImageDto {
  @ApiProperty({
    description: 'Subdirectory that receives the image',
    enum: UPLOAD_SUBDIRECTORY_NAMES,
    example: 'invoices',
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(UPLOAD_SUBDIRECTORY_NAMES)
  subdirectory: UploadSubdirectoryName;
}
