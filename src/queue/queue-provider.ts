import { JobEnvelope, QueueName } from '@/queue/job';

export const QUEUE_PROVIDER = Symbol('QUEUE_PROVIDER');

export type QueuedMessage = {
  queueName: QueueName;
  receipt: string;
  body: JobEnvelope;
  receiveCount: number;
};

export interface QueueProvider {
  enqueue(queueName: QueueName, body: JobEnvelope): Promise<void>;
  dequeue(queueName: QueueName): Promise<QueuedMessage | null>;
  ack(message: QueuedMessage): Promise<void>;
}
