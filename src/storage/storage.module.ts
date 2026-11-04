import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DiskStorage } from '@/storage/disk-storage';
import { STORAGE, Storage } from '@/storage/storage';

@Module({
  providers: [
    {
      provide: STORAGE,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): Storage =>
        new DiskStorage(configService.getOrThrow<string>('UPLOAD_DIR')),
    },
  ],
  exports: [STORAGE],
})
export class StorageModule {}
