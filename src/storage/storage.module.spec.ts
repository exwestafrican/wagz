import { ConfigService } from '@nestjs/config';
import { ENVIROMENT } from '@/common/const';
import { DiskStorage } from '@/storage/disk-storage';
import { ImageStoreClient } from '@/storage/storage.module';
import S3CloudStorage from '@/storage/s3-cloud-storage';

class FakeConfigService extends ConfigService {
  constructor(nodeEnv: string) {
    super({
      NODE_ENV: nodeEnv,
      AWS_FAHARI_S3_REGION: 'us-east-1',
      AWS_FAHARI_S3_ACESS_KEY: 'access-key',
      AWS_FAHARI_S3_SECRET_KEY: 'secret-key',
      UPLOAD_DIR: '/tmp/fahari-uploads',
    });
  }
}

describe('ImageStoreClient', () => {
  it('stores images in S3 when running in production', () => {
    const imageStore = ImageStoreClient.useFactory(
      new FakeConfigService(ENVIROMENT.PRODUCTION),
    );

    expect(imageStore).toBeInstanceOf(S3CloudStorage);
  });

  it('stores images on disk outside production', () => {
    const imageStore = ImageStoreClient.useFactory(
      new FakeConfigService(ENVIROMENT.DEVELOPMENT),
    );

    expect(imageStore).toBeInstanceOf(DiskStorage);
  });
});
