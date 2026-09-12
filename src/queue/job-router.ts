import { isQueueName, QueueName } from '@/queue/job';
import { UnknownJobPrefix } from '@/queue/unknown-job-prefix';

export class JobRouter {
  constructor(
    private readonly queueOverrides: Record<string, QueueName> = {},
  ) {}

  route(jobName: string): QueueName {
    const overriddenQueue = this.queueOverrides[jobName];
    if (overriddenQueue) {
      return overriddenQueue;
    }

    const separatorIndex = jobName.indexOf('.');
    if (separatorIndex <= 0 || separatorIndex === jobName.length - 1) {
      throw new UnknownJobPrefix(jobName);
    }

    const productPrefix = jobName.slice(0, separatorIndex);
    if (!isQueueName(productPrefix)) {
      throw new UnknownJobPrefix(jobName);
    }

    return productPrefix;
  }
}
