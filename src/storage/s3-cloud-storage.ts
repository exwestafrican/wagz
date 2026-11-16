import { Storage, UploadSubdirectory } from '@/storage/storage';
import { BadRequestException, Injectable } from '@nestjs/common';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import FileManager, {
  ImageDetails,
  MAX_IMAGE_BYTES,
} from '@/storage/file-manager';
import { randomUUID } from 'node:crypto';

@Injectable()
export default class S3CloudStorage implements Storage {
  constructor(
    private readonly s3Client: S3Client,
    private readonly fileManager: FileManager,
  ) {}

  async storeImage(
    imageBytes: Buffer,
    subdirectory: UploadSubdirectory,
  ): Promise<ImageDetails> {
    // got to s3 and save image
    if (this.fileManager.withinSizeLimit(imageBytes.length)) {
      const processedImage =
        await this.fileManager.validateAndProcessImage(imageBytes);
      const imageId = randomUUID();
      const path = `${imageId}.${processedImage.extension}`; //TODO move this into a class that can return the key
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: subdirectory.bucket,
          Key: path,
          Body: processedImage.buffer,
        }),
      );
      return {
        uuid: imageId,
        path: path,
      };
    }

    throw new BadRequestException(`Image exceeds ${MAX_IMAGE_BYTES}`);
  }
}
