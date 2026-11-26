import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { SupabaseAuthGuard } from '@/auth/guard/supabase.guard';
import ApiBadRequestResponse from '@/common/decorators/bad-response';
import { UploadImageDto } from '@/fahari/uploads/dto/upload-image.dto';
import { UploadedImageResponseDto } from '@/fahari/uploads/dto/uploaded-image-response.dto';
import { MAX_IMAGE_BYTES } from '@/storage/file-manager';
import {
  ImageStore,
  UPLOAD_SUBDIRECTORY_NAMES,
  uploadSubdirectoryByName,
} from '@/storage/image-store';

type UploadedImageFile = {
  buffer: Buffer;
};

@Controller('fahari/uploads')
@ApiTags('fahari-uploads')
export class UploadsController {
  constructor(private readonly imageStore: ImageStore) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(SupabaseAuthGuard)
  @UseInterceptors(FileInterceptor('image'))
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload an image into a known subdirectory' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['image', 'subdirectory'],
      properties: {
        image: { type: 'string', format: 'binary' },
        subdirectory: {
          type: 'string',
          enum: [...UPLOAD_SUBDIRECTORY_NAMES],
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Image stored',
    type: UploadedImageResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid access token',
  })
  @ApiBadRequestResponse()
  async uploadImage(
    @UploadedFile() image: UploadedImageFile | undefined,
    @Body() uploadImageDto: UploadImageDto,
  ): Promise<UploadedImageResponseDto> {
    if (!image?.buffer) {
      throw new BadRequestException('Image is required');
    }

    if (image.buffer.length > MAX_IMAGE_BYTES) {
      throw new BadRequestException(`Image exceeds ${MAX_IMAGE_BYTES}`);
    }

    const subdirectory = uploadSubdirectoryByName(uploadImageDto.subdirectory);
    if (!subdirectory) {
      throw new BadRequestException('Unknown upload subdirectory');
    }

    return this.imageStore.storeImage(image.buffer, subdirectory);
  }
}
