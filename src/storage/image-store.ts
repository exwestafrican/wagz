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

export abstract class ImageStore {
  abstract storeImage(
    imageBytes: Buffer,
    subdirectory: UploadSubdirectory,
  ): Promise<ImageDetails>;
}
