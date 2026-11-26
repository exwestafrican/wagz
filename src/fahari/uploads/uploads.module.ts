import { Module } from '@nestjs/common';
import { StorageModule } from '@/storage/storage.module';
import { UploadsController } from '@/fahari/uploads/uploads.controller';

@Module({
  imports: [StorageModule],
  controllers: [UploadsController],
})
export class UploadsModule {}
