import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BadRequestException } from '@nestjs/common';
import sharp from 'sharp';
import { DiskStorage } from '@/storage/disk-storage';
import FileManager, { MAX_IMAGE_BYTES } from '@/storage/file-manager';
import { UPLOAD_SUBDIRECTORIES } from '@/storage/storage';

async function imageBytes(format: 'png' | 'webp'): Promise<Buffer> {
  const pipeline = sharp({
    create: {
      width: 2,
      height: 2,
      channels: 3,
      background: { r: 20, g: 80, b: 160 },
    },
  });

  if (format === 'png') {
    return pipeline.png().toBuffer();
  }
  return pipeline.webp().toBuffer();
}

describe('DiskStorage', () => {
  let uploadDirectory: string;
  let diskStorage: DiskStorage;

  beforeEach(async () => {
    uploadDirectory = await mkdtemp(join(tmpdir(), 'uploads-'));
    diskStorage = new DiskStorage(uploadDirectory);
  });

  afterEach(async () => {
    await rm(uploadDirectory, { recursive: true, force: true });
  });

  it('writes a png and returns its id', async () => {
    const pngBytes = await imageBytes('png');

    const storedImageId = await diskStorage.storeImage(
      pngBytes,
      UPLOAD_SUBDIRECTORIES.INVOICES,
    );

    expect(storedImageId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    const writtenBytes = await readFile(
      join(uploadDirectory, 'invoices', `${storedImageId}.png`),
    );
    const processedImage = await new FileManager().validateAndProcessImage(
      pngBytes,
    );
    expect(writtenBytes.equals(processedImage.buffer)).toBe(true);
  });

  it('stores the re-encoded image and drops trailing upload bytes', async () => {
    const pngBytes = await imageBytes('png');
    const trailingPayload = Buffer.from('TRAILING-PAYLOAD');
    const uploadBytes = Buffer.concat([pngBytes, trailingPayload]);

    const storedImageId = await diskStorage.storeImage(
      uploadBytes,
      UPLOAD_SUBDIRECTORIES.INVOICES,
    );

    const writtenBytes = await readFile(
      join(uploadDirectory, 'invoices', `${storedImageId}.png`),
    );
    const processedImage = await new FileManager().validateAndProcessImage(
      uploadBytes,
    );
    expect(writtenBytes.equals(processedImage.buffer)).toBe(true);
    expect(writtenBytes.includes(trailingPayload)).toBe(false);
  });

  it('writes a webp using the webp extension', async () => {
    const webpBytes = await imageBytes('webp');

    const storedImageId = await diskStorage.storeImage(
      webpBytes,
      UPLOAD_SUBDIRECTORIES.INVOICES,
    );

    const storedFileNames = await readdir(join(uploadDirectory, 'invoices'));
    expect(storedFileNames).toEqual([`${storedImageId}.webp`]);
  });

  it('writes an image into the events subdirectory', async () => {
    const pngBytes = await imageBytes('png');

    const storedImageId = await diskStorage.storeImage(
      pngBytes,
      UPLOAD_SUBDIRECTORIES.EVENTS,
    );

    const eventFileNames = await readdir(join(uploadDirectory, 'events'));
    expect(eventFileNames).toEqual([`${storedImageId}.png`]);
    expect(await readdir(uploadDirectory)).toEqual(['events']);
  });

  it('stores another image when the subdirectory already exists', async () => {
    const pngBytes = await imageBytes('png');

    const firstImageId = await diskStorage.storeImage(
      pngBytes,
      UPLOAD_SUBDIRECTORIES.INVOICES,
    );
    const secondImageId = await diskStorage.storeImage(
      pngBytes,
      UPLOAD_SUBDIRECTORIES.INVOICES,
    );

    const invoiceFileNames = await readdir(join(uploadDirectory, 'invoices'));
    expect(invoiceFileNames.sort()).toEqual(
      [`${firstImageId}.png`, `${secondImageId}.png`].sort(),
    );
  });

  it('rejects bytes that are not a supported image before writing', async () => {
    await expect(
      diskStorage.storeImage(
        Buffer.from('not-an-image'),
        UPLOAD_SUBDIRECTORIES.INVOICES,
      ),
    ).rejects.toThrow();
    expect(await readdir(join(uploadDirectory, 'invoices'))).toEqual([]);
  });

  it('rejects an image over 5 MB before writing', async () => {
    const oversizedImage = Buffer.alloc(MAX_IMAGE_BYTES + 1);

    await expect(
      diskStorage.storeImage(oversizedImage, UPLOAD_SUBDIRECTORIES.INVOICES),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(await readdir(uploadDirectory)).toEqual([]);
  });
});
