import { StaticQueue } from '@/common/static-queue';

export function ConcurrentLimit<T>(limit: number, numOfProcesses: number) {
  const queue = StaticQueue<() => Promise<void>>(numOfProcesses);
  let running = 0;

  function runTask(exec: () => Promise<void>): void {
    running++;
    exec().finally(() => {
      running--;
      if (queue.peek() != undefined) {
        const nextTask = queue.dequeue();
        runTask(nextTask);
      }
    });
  }

  async function run(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const exec = () => task().then(resolve, reject);

      if (running < limit) {
        runTask(exec);
      } else {
        queue.add(exec);
      }
    });
  }

  return { run };
}
