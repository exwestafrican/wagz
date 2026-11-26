import { ConfigService } from '@nestjs/config';
import { ENVIROMENT } from '@/common/const';
import { DiskStorage } from '@/storage/disk-storage';
import { ImageStoreClient } from '@/storage/storage.module';
import S3CloudStorage from '@/storage/s3-cloud-storage';

function configService(nodeEnv: string): ConfigService {
  const values: Record<string, string> = {
    NODE_ENV: nodeEnv,
    AWS_FAHARI_S3_REGION: 'us-east-1',
    AWS_FAHARI_S3_ACESS_KEY: 'access-key',
    AWS_FAHARI_S3_SECRET_KEY: 'secret-key',
    UPLOAD_DIR: '/tmp/fahari-uploads',
  };
  return {
    get: (key: string) => values[key],
    getOrThrow: (key: string) => {
      const value = values[key];
      if (value === undefined) {
        throw new Error(`Missing ${key}`);
      }
      return value;
    },
  } as ConfigService;
}

describe('ImageStoreClient', () => {
  it('stores images in S3 when running in production', () => {
    const imageStore = ImageStoreClient.useFactory(
      configService(ENVIROMENT.PRODUCTION),
    );

    expect(imageStore).toBeInstanceOf(S3CloudStorage);
  });

  it('stores images on disk outside production', () => {
    const imageStore = ImageStoreClient.useFactory(
      configService(ENVIROMENT.DEVELOPMENT),
    );

    expect(imageStore).toBeInstanceOf(DiskStorage);
  });
});
