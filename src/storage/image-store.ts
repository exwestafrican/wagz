import { ImageDetails } from '@/storage/file-manager';

export const STORAGE = Symbol('STORAGE');

export const UPLOADS_BUCKET = 'fahari-app-uploads';

export enum UploadSubdirectory {
  // Keeps invoice images
  INVOICES = 'invoices',
  // Keeps images for events
  EVENTS = 'events',
}

export abstract class ImageStore {
  abstract storeImage(
    imageBytes: Buffer,
    subdirectory: UploadSubdirectory,
  ): Promise<ImageDetails>;
}
