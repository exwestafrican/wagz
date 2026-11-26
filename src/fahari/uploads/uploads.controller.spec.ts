import { BadRequestException } from '@nestjs/common';
import { UploadImageDto } from '@/fahari/uploads/dto/upload-image.dto';
import { UploadsController } from '@/fahari/uploads/uploads.controller';
import { ImageDetails, MAX_IMAGE_BYTES } from '@/storage/file-manager';
import { ImageStore, UPLOAD_SUBDIRECTORIES } from '@/storage/image-store';

describe('UploadsController', () => {
  const storedInvoiceImage: ImageDetails = {
    uuid: '6f1b4c2a-7e3d-4a91-9c0b-1d2e3f4a5b6c',
    path: 'invoices/6f1b4c2a-7e3d-4a91-9c0b-1d2e3f4a5b6c.png',
  };

  let storeImage: jest.Mock;
  let uploadsController: UploadsController;

  beforeEach(() => {
    storeImage = jest.fn().mockResolvedValue(storedInvoiceImage);
    const imageStore = { storeImage } as unknown as ImageStore;
    uploadsController = new UploadsController(imageStore);
  });

  it('stores the image in the requested subdirectory', async () => {
    const invoiceBytes = Buffer.from('png-bytes');

    const uploadedImage = await uploadsController.uploadImage(
      { buffer: invoiceBytes },
      { subdirectory: 'invoices' },
    );

    expect(storeImage).toHaveBeenCalledWith(
      invoiceBytes,
      UPLOAD_SUBDIRECTORIES.INVOICES,
    );
    expect(uploadedImage).toEqual(storedInvoiceImage);
  });

  it('rejects a request with no image', async () => {
    await expect(
      uploadsController.uploadImage(undefined, { subdirectory: 'events' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(storeImage).not.toHaveBeenCalled();
  });

  it('rejects an unknown subdirectory', async () => {
    await expect(
      uploadsController.uploadImage({ buffer: Buffer.from('png-bytes') }, {
        subdirectory: 'avatars',
      } as UploadImageDto),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(storeImage).not.toHaveBeenCalled();
  });

  it('rejects an image over 5 MB before storing', async () => {
    const oversizedImage = Buffer.alloc(MAX_IMAGE_BYTES + 1);

    await expect(
      uploadsController.uploadImage(
        { buffer: oversizedImage },
        { subdirectory: 'invoices' },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(storeImage).not.toHaveBeenCalled();
  });
});
