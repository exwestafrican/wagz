import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageStore, UploadSubdirectory } from '@/storage/image-store';
import FileManager, { ImageDetails } from '@/storage/file-manager';

@Injectable()
export class DiskStorage implements ImageStore {
  logger = new Logger(DiskStorage.name);
  fileManager = new FileManager();

  constructor(private readonly uploadDirectory: string) {}

  async storeImage(
    imageBytes: Buffer,
    subdirectory: UploadSubdirectory,
  ): Promise<ImageDetails> {
    if (!this.fileManager.withinSizeLimit(imageBytes.length))
      throw new BadRequestException('Image exceeds 5 MB');

    const destinationDirectory = join(this.uploadDirectory, subdirectory.name);

    await mkdir(destinationDirectory, { recursive: true });

    const imageDetails = await this.fileManager.writeImageIfSupported(
      destinationDirectory,
      imageBytes,
    );
    this.logger.log(`Stored upload ${imageDetails.uuid}`);
    return imageDetails;
  }
}
