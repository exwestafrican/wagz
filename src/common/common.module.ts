import { Module } from '@nestjs/common';
import { LinkService } from '@/common/link-service';
import { DebounceServiceProvider } from '@/common/debounce.service';

@Module({
  providers: [LinkService, DebounceServiceProvider],
  exports: [LinkService, DebounceServiceProvider],
})
export class CommonModule {}
