import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DiskStorage } from '@/storage/disk-storage';
import { STORAGE, Storage } from '@/storage/storage';
import { S3Client } from '@aws-sdk/client-s3';

export const S3_CLIENT = Symbol('S3_CLIENT');

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

@Module({
  providers: [
    {
      provide: STORAGE,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): Storage =>
        new DiskStorage(configService.getOrThrow<string>('UPLOAD_DIR')),
    },
    S3CloudClient,
  ],
  exports: [STORAGE, S3CloudClient],
})
export class StorageModule {}
