import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DiskStorage } from '@/storage/disk-storage';

@Module({
  providers: [
    {
      provide: DiskStorage,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        new DiskStorage(configService.getOrThrow<string>('UPLOAD_DIR')),
    },
  ],
  exports: [DiskStorage],
})
export class StorageModule {}
