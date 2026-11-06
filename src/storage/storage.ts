export const STORAGE = Symbol('STORAGE');

export const UPLOAD_SUBDIRECTORIES = {
  INVOICES: {
    description: 'Store invoice images',
    name: 'invoices',
  },
  EVENTS: {
    description: 'Store images for events',
    name: 'events',
  },
} as const;

export type UploadSubdirectory =
  (typeof UPLOAD_SUBDIRECTORIES)[keyof typeof UPLOAD_SUBDIRECTORIES];

export interface Storage {
  storeImage(
    imageBytes: Buffer,
    subdirectory: UploadSubdirectory,
  ): Promise<string>;
}
