import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Storage } from '@/storage/storage';
import FileManager from '@/storage/file-manager';

@Injectable()
export class DiskStorage implements Storage {
  logger = new Logger(DiskStorage.name);
  fileManager = new FileManager();

  constructor(private readonly uploadDirectory: string) {}

  async storeImage(imageBytes: Buffer): Promise<string> {
    if (!this.fileManager.withinSizeLimit(imageBytes.length))
      throw new BadRequestException('Image exceeds 5 MB');

    const imageDetails = await this.fileManager.writeImageIfSupported(
      this.uploadDirectory,
      imageBytes,
    );
    this.logger.log(`Stored upload ${imageDetails.uuid}`);
    return imageDetails.uuid;
  }
}
