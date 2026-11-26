import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';
import { ENVIROMENT } from '@/common/const';
import { DiskStorage } from '@/storage/disk-storage';
import FileManager from '@/storage/file-manager';
import { ImageStore } from '@/storage/image-store';
import S3CloudStorage from '@/storage/s3-cloud-storage';

export const ImageStoreClient = {
  provide: ImageStore,
  inject: [ConfigService],
  useFactory: (configService: ConfigService): ImageStore => {
    if (configService.get<string>('NODE_ENV') === ENVIROMENT.PRODUCTION) {
      const s3Client = new S3Client({
        region: configService.getOrThrow('AWS_FAHARI_S3_REGION'),
        credentials: {
          accessKeyId: configService.getOrThrow('AWS_FAHARI_S3_ACESS_KEY'),
          secretAccessKey: configService.getOrThrow('AWS_FAHARI_S3_SECRET_KEY'),
        },
      });
      return new S3CloudStorage(s3Client, new FileManager());
    }
    return new DiskStorage(configService.getOrThrow<string>('UPLOAD_DIR'));
  },
};

@Module({
  providers: [ImageStoreClient],
  exports: [ImageStoreClient],
})
export class StorageModule {}
