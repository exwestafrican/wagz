import { JobQueue } from '@/queue/job-queue';
import { InMemoryQueueProvider } from '@/queue/in-memory-queue-provider';
import { UnknownQueueName } from '@/queue/unknown-queue-name';

describe('JobQueue', () => {
  it('enqueues onto the named queue', async () => {
    const queueProvider = new InMemoryQueueProvider();
    const jobQueue = new JobQueue(queueProvider);

    await jobQueue.enqueue('email-notification', {
      workspaceId: 'workspace-kobo',
    });

    const queuedMessage = await queueProvider.dequeue('email-notification');
    expect(queuedMessage).not.toBeNull();
    expect(queuedMessage?.body.name).toBe('email-notification');
    expect(queuedMessage?.body.payload).toEqual({
      workspaceId: 'workspace-kobo',
    });
    expect(queuedMessage?.body.id).toEqual(expect.any(String));
    expect(queuedMessage?.body.enqueuedAt).toEqual(expect.any(String));
    expect(await queueProvider.dequeue('process-transaction')).toBeNull();
  });

  it('keeps process-transaction separate from email-notification', async () => {
    const queueProvider = new InMemoryQueueProvider();
    const jobQueue = new JobQueue(queueProvider);

    await jobQueue.enqueue('process-transaction', {
      transactionId: 'txn-1',
    });

    const queuedMessage = await queueProvider.dequeue('process-transaction');
    expect(queuedMessage?.body.name).toBe('process-transaction');
    expect(await queueProvider.dequeue('email-notification')).toBeNull();
  });

  it('does not enqueue when the queue name is unknown', async () => {
    const queueProvider = new InMemoryQueueProvider();
    const jobQueue = new JobQueue(queueProvider);

    await expect(jobQueue.enqueue('billing-charge', {})).rejects.toThrow(
      UnknownQueueName,
    );
    expect(await queueProvider.dequeue('email-notification')).toBeNull();
    expect(await queueProvider.dequeue('process-transaction')).toBeNull();
  });
});
