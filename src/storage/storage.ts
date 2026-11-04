export const STORAGE = Symbol('STORAGE');

export interface Storage {
  storeImage(imageBytes: Buffer): Promise<string>;
}
