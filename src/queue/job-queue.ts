import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { isQueueName, JobEnvelope } from '@/queue/job';
import { QUEUE_PROVIDER, type QueueProvider } from '@/queue/queue-provider';
import { UnknownQueueName } from '@/queue/unknown-queue-name';

export const JOB_QUEUE = Symbol('JOB_QUEUE');

@Injectable()
export class JobQueue {
  constructor(
    @Inject(QUEUE_PROVIDER) private readonly queueProvider: QueueProvider,
  ) {}

  async enqueue(queueName: string, payload: unknown): Promise<void> {
    if (!isQueueName(queueName)) {
      throw new UnknownQueueName(queueName);
    }

    const jobEnvelope: JobEnvelope = {
      id: randomUUID(),
      name: queueName,
      payload,
      enqueuedAt: new Date().toISOString(),
    };
    await this.queueProvider.enqueue(queueName, jobEnvelope);
  }
}
