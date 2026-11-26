import { ImageDetails } from '@/storage/file-manager';

export const STORAGE = Symbol('STORAGE');

const S3Buckets = {
  UPLOADS: 'fahari-app-uploads',
};

function subDirectoryInDefaultBucket(subDirProperties: {
  description: string;
  name: string;
}) {
  return {
    ...subDirProperties,
    bucket: S3Buckets.UPLOADS,
  };
}
export const UPLOAD_SUBDIRECTORIES = {
  INVOICES: subDirectoryInDefaultBucket({
    description: 'Store invoice images',
    name: 'invoices',
  }),
  EVENTS: subDirectoryInDefaultBucket({
    description: 'Store images for events',
    name: 'events',
  }),
} as const;

export type UploadSubdirectory =
  (typeof UPLOAD_SUBDIRECTORIES)[keyof typeof UPLOAD_SUBDIRECTORIES];

export const UPLOAD_SUBDIRECTORY_NAMES = [
  UPLOAD_SUBDIRECTORIES.INVOICES.name,
  UPLOAD_SUBDIRECTORIES.EVENTS.name,
] as const;

export type UploadSubdirectoryName = (typeof UPLOAD_SUBDIRECTORY_NAMES)[number];

export function uploadSubdirectoryByName(
  name: string,
): UploadSubdirectory | undefined {
  return Object.values(UPLOAD_SUBDIRECTORIES).find(
    (subdirectory) => subdirectory.name === name,
  );
}

export abstract class ImageStore {
  abstract storeImage(
    imageBytes: Buffer,
    subdirectory: UploadSubdirectory,
  ): Promise<ImageDetails>;
}
