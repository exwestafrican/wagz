import { createTaskRegistry, registerBackfillTasks } from '@/backfill/task';

export const BACKFILL_REGISTRY = Symbol('BACKFILL_REGISTRY');

export const BackfillRegistryProvider = {
  provide: BACKFILL_REGISTRY,
  useFactory: () => {
    const registry = createTaskRegistry();
    registerBackfillTasks(registry);
    return registry;
  },
};
