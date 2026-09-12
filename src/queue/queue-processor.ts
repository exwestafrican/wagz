import { Inject, Injectable, Logger } from '@nestjs/common';
import { QUEUE_NAMES, QueueName } from '@/queue/job';
import {
  JOB_HANDLER_REGISTRY,
  type JobHandlerRegistry,
} from '@/queue/handler-registry';
import { QUEUE_PROVIDER, type QueueProvider } from '@/queue/queue-provider';

const UNKNOWN_JOB_RECEIVE_LIMIT = 5;
const IDLE_POLL_INTERVAL_MS = 250;

@Injectable()
export class QueueProcessor {
  private readonly logger = new Logger(QueueProcessor.name);
  unknownJobReceiveLimit = UNKNOWN_JOB_RECEIVE_LIMIT;
  idlePollIntervalMs = IDLE_POLL_INTERVAL_MS;

  constructor(
    @Inject(QUEUE_PROVIDER) private readonly queueProvider: QueueProvider,
    @Inject(JOB_HANDLER_REGISTRY)
    private readonly handlerRegistry: JobHandlerRegistry,
  ) {}

  async run(
    abortSignal?: AbortSignal,
    queueNames: QueueName[] = [...QUEUE_NAMES],
  ): Promise<void> {
    while (!abortSignal?.aborted) {
      for (const queueName of queueNames) {
        if (abortSignal?.aborted) {
          return;
        }
        const processOutcome = await this.processOnce(queueName);
        if (processOutcome !== 'processed') {
          await delay(this.idlePollIntervalMs, abortSignal);
        }
      }
    }
  }

  async processOnce(
    queueName: QueueName,
  ): Promise<'idle' | 'processed' | 'retry'> {
    const queuedMessage = await this.queueProvider.dequeue(queueName);
    if (!queuedMessage) {
      return 'idle';
    }

    const { name: jobName, id: jobId } = queuedMessage.body;
    const jobHandler = this.handlerRegistry.get(jobName);

    if (!jobHandler) {
      this.logger.error(`No handler for job: ${jobName} id=${jobId}`);
      if (queuedMessage.receiveCount >= this.unknownJobReceiveLimit) {
        await this.queueProvider.ack(queuedMessage);
        this.logger.error(
          `Dropped unknown job after ${queuedMessage.receiveCount} receives: ${jobName} id=${jobId}`,
        );
      }
      return 'retry';
    }

    try {
      await jobHandler.handle(queuedMessage.body.payload);
      await this.queueProvider.ack(queuedMessage);
      this.logger.log(`Processed job: ${jobName} id=${jobId}`);
      return 'processed';
    } catch (error) {
      this.logger.error(`Job failed: ${jobName} id=${jobId}`, error);
      return 'retry';
    }
  }
}

function delay(milliseconds: number, abortSignal?: AbortSignal): Promise<void> {
  if (abortSignal?.aborted) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const timeoutId = setTimeout(resolve, milliseconds);
    abortSignal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timeoutId);
        resolve();
      },
      { once: true },
    );
  });
}
