import { JobQueue } from '@/queue/job-queue';
import { JobRouter } from '@/queue/job-router';
import { InMemoryQueueProvider } from '@/queue/in-memory-queue-provider';
import { UnknownJobPrefix } from '@/queue/unknown-job-prefix';

describe('JobQueue', () => {
  it('enqueues an envoye job onto the envoye queue', async () => {
    const queueProvider = new InMemoryQueueProvider();
    const jobQueue = new JobQueue(queueProvider, new JobRouter());

    await jobQueue.enqueue('envoye.send-invite', {
      workspaceId: 'workspace-kobo',
    });

    const queuedMessage = await queueProvider.dequeue('envoye');
    expect(queuedMessage).not.toBeNull();
    expect(queuedMessage?.body.name).toBe('envoye.send-invite');
    expect(queuedMessage?.body.payload).toEqual({
      workspaceId: 'workspace-kobo',
    });
    expect(queuedMessage?.body.id).toEqual(expect.any(String));
    expect(queuedMessage?.body.enqueuedAt).toEqual(expect.any(String));
    expect(await queueProvider.dequeue('fahari')).toBeNull();
  });

  it('enqueues a fahari job onto the fahari queue', async () => {
    const queueProvider = new InMemoryQueueProvider();
    const jobQueue = new JobQueue(queueProvider, new JobRouter());

    await jobQueue.enqueue('fahari.geofence-alert', { deviceId: 'device-1' });

    const queuedMessage = await queueProvider.dequeue('fahari');
    expect(queuedMessage?.body.name).toBe('fahari.geofence-alert');
    expect(await queueProvider.dequeue('envoye')).toBeNull();
  });

  it('does not enqueue when the job name has an unknown prefix', async () => {
    const queueProvider = new InMemoryQueueProvider();
    const jobQueue = new JobQueue(queueProvider, new JobRouter());

    await expect(jobQueue.enqueue('billing.charge', {})).rejects.toThrow(
      UnknownJobPrefix,
    );
    expect(await queueProvider.dequeue('envoye')).toBeNull();
    expect(await queueProvider.dequeue('fahari')).toBeNull();
  });
});
