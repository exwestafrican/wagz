import { ConcurrentLimit } from '@/common/concurrent-runner';

describe('Concurrent Runner', () => {
  it('respects concurrency limit', async () => {
    const limit = 2;
    const numOfProcesses = 50;
    const concurrentLimit = ConcurrentLimit<void>(2, numOfProcesses);

    let active = 0;
    let maxActive = 0;

    const createTask = async (delay: number) => {
      active++;
      maxActive = Math.max(active, maxActive);

      await new Promise((resolve) => setTimeout(resolve, delay));

      active--;
    };

    const tasks: Promise<void>[] = [];

    for (let i = 0; i < numOfProcesses; i++) {
      tasks.push(concurrentLimit.run(() => createTask(2)));
    }

    await Promise.all(tasks);

    expect(maxActive).toBeLessThanOrEqual(limit);
  });
});
