import sharp from 'sharp';
import { million } from '@/common/utils';
import {
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { access, constants, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const SUPPORTED_FORMAT = {
  jpeg: {
    extension: 'jpg',
    contentType: 'image/jpeg',
  },
  png: {
    extension: 'png',
    contentType: 'image/png',
  },
  webp: {
    extension: 'webp',
    contentType: 'image/webp',
  },
};

export type ImageDetails = {
  uuid: string;
};

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export default class FileManager {
  logger = new Logger(FileManager.name);

  constructor() {}

  async validateAndProcessImage(imageBytes: Buffer) {
    const metadata = await sharp(imageBytes, {
      limitInputPixels: million(20),
      failOn: 'error',
    }).metadata();

    if (!SUPPORTED_FORMAT[metadata.format ?? ''])
      throw new BadRequestException('Invalid image format');

    const pipeline = sharp(imageBytes, {
      limitInputPixels: 20_000_000,
      failOn: 'error',
    }).rotate(); //t automatically corrects the orientation when the image's metadata indicates that it needs correcting

    switch (metadata.format) {
      case 'jpeg':
        return {
          buffer: await pipeline.jpeg({ quality: 85 }).toBuffer(),
          extension: SUPPORTED_FORMAT.jpeg.extension,
        };
      case 'png':
        return {
          buffer: await pipeline.png({ compressionLevel: 8 }).toBuffer(),
          extension: SUPPORTED_FORMAT.png.extension,
        };
      case 'webp':
        return {
          buffer: await pipeline.webp({ quality: 85 }).toBuffer(),
          extension: SUPPORTED_FORMAT.webp.extension,
        };
      default:
        throw new BadRequestException('Unsupported image format');
    }
  }

  withinSizeLimit(byteLength: number): boolean {
    return byteLength <= MAX_IMAGE_BYTES;
  }

  private async assertUploadDirectoryWritable(
    uploadDirectory: string,
  ): Promise<void> {
    try {
      await access(uploadDirectory, constants.W_OK);
    } catch {
      this.logger.error('Upload directory is not writable');
      throw new InternalServerErrorException('Upload storage is unavailable');
    }
  }

  async writeImageIfSupported(
    uploadDirectory: string,
    imageBytes: Buffer,
  ): Promise<ImageDetails> {
    if (!this.withinSizeLimit(imageBytes.length))
      throw new BadRequestException('Image exceeds 5 MB');

    await this.assertUploadDirectoryWritable(uploadDirectory);

    const processedImage = await this.validateAndProcessImage(imageBytes);

    const imageId = randomUUID();
    await writeFile(
      join(uploadDirectory, `${imageId}.${processedImage.extension}`),
      imageBytes,
      {
        flag: 'wx', //so it doesn't overright if exists
        mode: 0o640,
      },
    );
    return {
      uuid: imageId,
    };
  }
}
