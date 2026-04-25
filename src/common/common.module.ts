import { Module } from '@nestjs/common';
import { LinkService } from '@/common/link-service';
import DebounceService from '@/common/debounce.service';
import { DEBOUNCE_SERVICE } from '@/common/debounce.service';

const DebounceServiceProvider = {
  provide: DEBOUNCE_SERVICE,
  useFactory: () => {
    return new DebounceService();
  },
};

@Module({
  providers: [LinkService, DebounceServiceProvider],
  exports: [LinkService, DebounceServiceProvider],
})
export class CommonModule {}
