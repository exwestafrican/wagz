import S3CloudStorage from '@/storage/s3-cloud-storage';
import { S3Client } from '@aws-sdk/client-s3';
import FileManager, { MAX_IMAGE_BYTES } from '@/storage/file-manager';
import { imageBytes } from '@/storage/test.common';
import { UPLOAD_SUBDIRECTORIES } from '@/storage/image-store';
import { BadRequestException } from '@nestjs/common';

describe('S3 cloud storage', () => {
  let fileManager: FileManager;
  let s3CloudStorage: S3CloudStorage;
  let send: jest.Mock;

  beforeEach(() => {
    fileManager = new FileManager();
    send = jest.fn();
    const mockS3Client = { send } as unknown as S3Client;
    s3CloudStorage = new S3CloudStorage(mockS3Client, fileManager);
  });

  test.each(['png', 'webp'])(
    'it writes image with correct extension %s',
    async (extension: string) => {
      const bytesOfImage = await imageBytes(extension);
      const imageDetails = await s3CloudStorage.storeImage(
        bytesOfImage,
        UPLOAD_SUBDIRECTORIES.EVENTS,
      );

      expect(imageDetails).toEqual({
        uuid: imageDetails.uuid,
        path: `events/${imageDetails.uuid}.${extension}`,
      });
    },
  );

  it('rejects bytes that are not a supported image before writing', async () => {
    await expect(
      s3CloudStorage.storeImage(
        Buffer.from('not-an-image'),
        UPLOAD_SUBDIRECTORIES.INVOICES,
      ),
    ).rejects.toThrow();
    expect(send).not.toHaveBeenCalled();
  });

  it('rejects an image over 5 MB before writing', async () => {
    const oversizedImage = Buffer.alloc(MAX_IMAGE_BYTES + 1);

    await expect(
      s3CloudStorage.storeImage(oversizedImage, UPLOAD_SUBDIRECTORIES.INVOICES),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(send).not.toHaveBeenCalled();
  });

  it('stores the re-encoded image and drops trailing upload bytes', async () => {
    const pngBytes = await imageBytes('png');
    const trailingPayload = Buffer.from('TRAILING-PAYLOAD');
    const uploadBytes = Buffer.concat([pngBytes, trailingPayload]);

    const imageDetails = await s3CloudStorage.storeImage(
      uploadBytes,
      UPLOAD_SUBDIRECTORIES.EVENTS,
    );

    const processedImage =
      await fileManager.validateAndProcessImage(uploadBytes);

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        input: {
          Bucket: UPLOAD_SUBDIRECTORIES.EVENTS.bucket,
          Key: `events/${imageDetails.uuid}.png`,
          Body: processedImage.buffer,
        },
      }),
    );
  });
});
