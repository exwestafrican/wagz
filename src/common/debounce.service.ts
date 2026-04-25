import { Logger } from '@nestjs/common';
import DebounceException from '@/common/exceptions/debounce';

interface DebounceItem {
  ignoreSec: number; // how long should we ignore for
  issuedAt: number; // when did we add this
}

export const DEBOUNCE_SERVICE = Symbol('DEBOUNCE_SERVICE');

export default class DebounceService {
  logger = new Logger(DebounceService.name);

  private store: Record<string, DebounceItem> = {};

  private notInStore(id: string) {
    return this.store[id] === undefined;
  }

  private addToStore(debounceId: string, ignoreSec: number) {
    const issuedAt = Math.floor(Date.now() / 1000);
    this.store[debounceId] = {
      ignoreSec: ignoreSec,
      issuedAt: issuedAt,
    };
  }

  private removeFromStore(debounceId: string) {
    delete this.store[debounceId];
  }

  async ignoreOrRun<T>(debounceId: string, ignoreSec: number, action: () => T) {
    try {
      this.logger.log(`running with debouncer; requestId=${debounceId}`);
      if (this.notInStore(debounceId)) {
        this.logger.log(
          `Adding request to store; requestId=${debounceId} ignoreSec=${ignoreSec}`,
        );
        this.addToStore(debounceId, ignoreSec);
        return await action();
      }
      return await this.ignoreOrRunInStore(debounceId, action);
    } catch (e) {
      this.logger.error('Rolling back debouncing due to error', e);
      this.removeFromStore(debounceId);
      throw e;
    }
  }

  async runOrThrow<T>(debounceId: string, ignoreSec: number, action: () => T) {
    const result = await this.ignoreOrRun(debounceId, ignoreSec, action);
    if (result) {
      return result;
    }
    throw new DebounceException(
      `Retry after cool off period; requestId=${debounceId}`,
    );
  }

  private async ignoreOrRunInStore<T>(debounceId: string, action: () => T) {
    const debounceItem = this.store[debounceId];
    const now = Math.floor(Date.now() / 1000);
    const ignoreTill = debounceItem.issuedAt + debounceItem.ignoreSec;

    if (now > ignoreTill) {
      this.logger.log(`Taking action for request; requestId=${debounceId}`);
      //remove it from store
      return await action();
    }

    this.logger.warn(
      `Skipping action for request; requestId=${debounceId} now=${now} ignoreTill=${ignoreTill}`,
    );
  }
}

export const DebounceServiceProvider = {
  provide: DEBOUNCE_SERVICE,
  useFactory: () => {
    return new DebounceService();
  },
};
