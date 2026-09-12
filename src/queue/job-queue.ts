import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { JobEnvelope } from '@/queue/job';
import { JobRouter } from '@/queue/job-router';
import { QUEUE_PROVIDER, type QueueProvider } from '@/queue/queue-provider';

export const JOB_QUEUE = Symbol('JOB_QUEUE');

@Injectable()
export class JobQueue {
  constructor(
    @Inject(QUEUE_PROVIDER) private readonly queueProvider: QueueProvider,
    private readonly jobRouter: JobRouter,
  ) {}

  async enqueue(jobName: string, payload: unknown): Promise<void> {
    const queueName = this.jobRouter.route(jobName);
    const jobEnvelope: JobEnvelope = {
      id: randomUUID(),
      name: jobName,
      payload,
      enqueuedAt: new Date().toISOString(),
    };
    await this.queueProvider.enqueue(queueName, jobEnvelope);
  }
}
