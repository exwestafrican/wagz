import { JobEnvelope } from '@/queue/job';
import { InMemoryQueueProvider } from '@/queue/in-memory-queue-provider';

function notificationEnvelope(id: string): JobEnvelope {
  return {
    id,
    name: 'email-notification',
    payload: { workspaceId: id },
    enqueuedAt: '2026-09-12T12:00:00.000Z',
  };
}

describe('InMemoryQueueProvider', () => {
  it('dequeues in FIFO order', async () => {
    const queueProvider = new InMemoryQueueProvider();
    const firstNotification = notificationEnvelope('workspace-first');
    const secondNotification = notificationEnvelope('workspace-second');

    await queueProvider.enqueue('email-notification', firstNotification);
    await queueProvider.enqueue('email-notification', secondNotification);

    const firstQueuedMessage =
      await queueProvider.dequeue('email-notification');
    const secondQueuedMessage =
      await queueProvider.dequeue('email-notification');

    expect(firstQueuedMessage?.body).toEqual(firstNotification);
    expect(secondQueuedMessage?.body).toEqual(secondNotification);
  });

  it('keeps named queues isolated', async () => {
    const queueProvider = new InMemoryQueueProvider();
    const notificationJob = notificationEnvelope('workspace-kobo');
    const transactionJob: JobEnvelope = {
      id: 'txn-1',
      name: 'process-transaction',
      payload: { transactionId: 'txn-1' },
      enqueuedAt: '2026-09-12T12:00:00.000Z',
    };

    await queueProvider.enqueue('email-notification', notificationJob);
    await queueProvider.enqueue('process-transaction', transactionJob);

    expect(await queueProvider.dequeue('process-transaction')).toMatchObject({
      body: transactionJob,
    });
    expect(await queueProvider.dequeue('email-notification')).toMatchObject({
      body: notificationJob,
    });
  });

  it('does not redeliver after ack', async () => {
    const queueProvider = new InMemoryQueueProvider();
    await queueProvider.enqueue(
      'email-notification',
      notificationEnvelope('workspace-kobo'),
    );

    const queuedMessage = await queueProvider.dequeue('email-notification');
    expect(queuedMessage).not.toBeNull();
    if (!queuedMessage) {
      return;
    }
    await queueProvider.ack(queuedMessage);

    expect(await queueProvider.dequeue('email-notification')).toBeNull();
  });

  it('redelivers an unacked message and increments receiveCount', async () => {
    const queueProvider = new InMemoryQueueProvider(0);
    await queueProvider.enqueue(
      'email-notification',
      notificationEnvelope('workspace-kobo'),
    );

    const firstDelivery = await queueProvider.dequeue('email-notification');
    expect(firstDelivery?.receiveCount).toBe(1);

    const redelivery = await queueProvider.dequeue('email-notification');
    expect(redelivery?.receipt).toBe(firstDelivery?.receipt);
    expect(redelivery?.receiveCount).toBe(2);
    expect(redelivery?.body).toEqual(firstDelivery?.body);
  });

  it('returns null when the queue is empty', async () => {
    const queueProvider = new InMemoryQueueProvider();
    expect(await queueProvider.dequeue('email-notification')).toBeNull();
  });
});
