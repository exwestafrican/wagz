import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BadRequestException } from '@nestjs/common';
import sharp from 'sharp';
import { DiskStorage } from '@/storage/disk-storage';
import { MAX_IMAGE_BYTES } from '@/storage/file-manager';

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

    const storedImageId = await diskStorage.storeImage(pngBytes);

    expect(storedImageId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    const writtenBytes = await readFile(
      join(uploadDirectory, `${storedImageId}.png`),
    );
    expect(writtenBytes.equals(pngBytes)).toBe(true);
  });

  it('writes a webp using the webp extension', async () => {
    const webpBytes = await imageBytes('webp');

    const storedImageId = await diskStorage.storeImage(webpBytes);

    const storedFileNames = await readdir(uploadDirectory);
    expect(storedFileNames).toEqual([`${storedImageId}.webp`]);
  });

  it('rejects bytes that are not a supported image before writing', async () => {
    await expect(
      diskStorage.storeImage(Buffer.from('not-an-image')),
    ).rejects.toThrow();
    expect(await readdir(uploadDirectory)).toEqual([]);
  });

  it('rejects an image over 5 MB before writing', async () => {
    const oversizedImage = Buffer.alloc(MAX_IMAGE_BYTES + 1);

    await expect(diskStorage.storeImage(oversizedImage)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(await readdir(uploadDirectory)).toEqual([]);
  });
});
