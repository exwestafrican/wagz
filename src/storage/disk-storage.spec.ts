import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BadRequestException } from '@nestjs/common';
import { DiskStorage } from '@/storage/disk-storage';
import { MAX_IMAGE_BYTES } from '@/storage/image-upload';

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

  it('writes an allowed image and returns its key', async () => {
    const imageBytes = Buffer.from('png-bytes');

    const storedImageKey = await diskStorage.storeImage(
      'image/png',
      imageBytes,
    );

    expect(storedImageKey).toMatch(/^uploads\/[0-9a-f-]{36}\.png$/);
    const storedFileName = storedImageKey.slice('uploads/'.length);
    const writtenBytes = await readFile(join(uploadDirectory, storedFileName));
    expect(writtenBytes.equals(imageBytes)).toBe(true);
  });

  it('rejects a content type outside the allow-list before writing', async () => {
    await expect(
      diskStorage.storeImage('image/gif', Buffer.from('gif-bytes')),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(await readdir(uploadDirectory)).toEqual([]);
  });

  it('rejects an image over 5 MB before writing', async () => {
    const oversizedImage = Buffer.alloc(MAX_IMAGE_BYTES + 1);

    await expect(
      diskStorage.storeImage('image/jpeg', oversizedImage),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(await readdir(uploadDirectory)).toEqual([]);
  });

  it('stores an image that is exactly 5 MB', async () => {
    const imageBytes = Buffer.alloc(MAX_IMAGE_BYTES);

    const storedImageKey = await diskStorage.storeImage(
      'image/webp',
      imageBytes,
    );

    expect(storedImageKey).toMatch(/\.webp$/);
    expect(await readdir(uploadDirectory)).toHaveLength(1);
  });
});
