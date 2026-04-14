import { Module } from '@nestjs/common';
import { LinkService } from '@/common/link-service';

@Module({
  providers: [LinkService],
  exports: [LinkService],
})
export class CommonModule {}
