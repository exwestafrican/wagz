import { BadRequestException } from '@nestjs/common';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const IMAGE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export function extensionForImageContentType(contentType: string): string {
  const extension = IMAGE_EXTENSIONS[contentType];
  if (!extension) {
    throw new BadRequestException('Unsupported image type');
  }
  return extension;
}

export function assertImageWithinSizeLimit(byteLength: number): void {
  if (byteLength > MAX_IMAGE_BYTES) {
    throw new BadRequestException('Image exceeds 5 MB');
  }
}
