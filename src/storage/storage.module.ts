import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DiskStorage } from '@/storage/disk-storage';
import { ImageStore } from '@/storage/image-store';
import { S3Client } from '@aws-sdk/client-s3';

export const S3CloudClient = {
  provide: S3Client,
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    return new S3Client({
      region: configService.getOrThrow('AWS_FAHARI_S3_REGION'),
      credentials: {
        accessKeyId: configService.getOrThrow('AWS_FAHARI_S3_ACESS_KEY'),
        secretAccessKey: configService.getOrThrow('AWS_FAHARI_S3_SECRET_KEY'),
      },
    });
  },
};

export const ImageStoreClient = {
  provide: ImageStore,
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    const isProduction = configService.get<string>('NODE_ENV') === 'production';
    if (isProduction) {
      return S3CloudClient;
    } else {
      return new DiskStorage(configService.getOrThrow<string>('UPLOAD_DIR'));
    }
  },
};

@Module({
  providers: [ImageStoreClient],
  exports: [ImageStoreClient],
})
export class StorageModule {}
