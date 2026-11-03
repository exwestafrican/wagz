import { randomUUID } from 'node:crypto';
import { access, constants, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import {
  assertImageWithinSizeLimit,
  extensionForImageContentType,
} from '@/storage/image-upload';

@Injectable()
export class DiskStorage {
  logger = new Logger(DiskStorage.name);

  constructor(private readonly uploadDirectory: string) {}

  async storeImage(contentType: string, imageBytes: Buffer): Promise<string> {
    const extension = extensionForImageContentType(contentType);
    assertImageWithinSizeLimit(imageBytes.length);
    await this.assertUploadDirectoryWritable();

    const imageId = randomUUID();
    const storedImageKey = `uploads/${imageId}.${extension}`;
    await writeFile(
      join(this.uploadDirectory, `${imageId}.${extension}`),
      imageBytes,
      {
        flag: 'wx',
      },
    );
    this.logger.log(`Stored upload ${storedImageKey}`);
    return storedImageKey;
  }

  private async assertUploadDirectoryWritable(): Promise<void> {
    try {
      await access(this.uploadDirectory, constants.W_OK);
    } catch {
      this.logger.error('Upload directory is not writable');
      throw new InternalServerErrorException('Upload storage is unavailable');
    }
  }
}
