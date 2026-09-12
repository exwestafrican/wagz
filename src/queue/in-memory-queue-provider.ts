import { JobEnvelope, QUEUE_NAMES, QueueName } from '@/queue/job';
import { type QueuedMessage, type QueueProvider } from '@/queue/queue-provider';

type InFlightMessage = {
  queueName: QueueName;
  receipt: string;
  body: JobEnvelope;
  receiveCount: number;
  visibleAt: number;
};

function emptyWaitingBuffers(): Record<QueueName, JobEnvelope[]> {
  const waitingBuffers = {} as Record<QueueName, JobEnvelope[]>;
  for (const queueName of QUEUE_NAMES) {
    waitingBuffers[queueName] = [];
  }
  return waitingBuffers;
}

export class InMemoryQueueProvider implements QueueProvider {
  private readonly waiting = emptyWaitingBuffers();
  private readonly inFlight = new Map<string, InFlightMessage>();
  private receiptSequence = 0;

  constructor(private readonly visibilityTimeoutMs = 30_000) {}

  enqueue(queueName: QueueName, body: JobEnvelope): Promise<void> {
    this.waiting[queueName].push(body);
    return Promise.resolve();
  }

  dequeue(queueName: QueueName): Promise<QueuedMessage | null> {
    const now = Date.now();
    const redeliveredMessage = this.redeliverExpired(queueName, now);
    if (redeliveredMessage) {
      return Promise.resolve(redeliveredMessage);
    }

    const nextEnvelope = this.waiting[queueName].shift();
    if (!nextEnvelope) {
      return Promise.resolve(null);
    }

    this.receiptSequence += 1;
    const receipt = `${queueName}-${this.receiptSequence}`;
    const inFlightMessage: InFlightMessage = {
      queueName,
      receipt,
      body: nextEnvelope,
      receiveCount: 1,
      visibleAt: now + this.visibilityTimeoutMs,
    };
    this.inFlight.set(receipt, inFlightMessage);

    return Promise.resolve({
      queueName,
      receipt,
      body: nextEnvelope,
      receiveCount: 1,
    });
  }

  ack(message: QueuedMessage): Promise<void> {
    this.inFlight.delete(message.receipt);
    return Promise.resolve();
  }

  private redeliverExpired(
    queueName: QueueName,
    now: number,
  ): QueuedMessage | null {
    for (const inFlightMessage of this.inFlight.values()) {
      if (
        inFlightMessage.queueName !== queueName ||
        inFlightMessage.visibleAt > now
      ) {
        continue;
      }

      inFlightMessage.receiveCount += 1;
      inFlightMessage.visibleAt = now + this.visibilityTimeoutMs;
      return {
        queueName,
        receipt: inFlightMessage.receipt,
        body: inFlightMessage.body,
        receiveCount: inFlightMessage.receiveCount,
      };
    }

    return null;
  }
}
