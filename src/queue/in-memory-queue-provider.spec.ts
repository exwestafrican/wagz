import { JobEnvelope } from '@/queue/job';
import { InMemoryQueueProvider } from '@/queue/in-memory-queue-provider';

function inviteEnvelope(id: string): JobEnvelope {
  return {
    id,
    name: 'envoye.send-invite',
    payload: { workspaceId: id },
    enqueuedAt: '2026-09-12T12:00:00.000Z',
  };
}

describe('InMemoryQueueProvider', () => {
  it('dequeues in FIFO order', async () => {
    const queueProvider = new InMemoryQueueProvider();
    const firstInvite = inviteEnvelope('workspace-first');
    const secondInvite = inviteEnvelope('workspace-second');

    await queueProvider.enqueue('envoye', firstInvite);
    await queueProvider.enqueue('envoye', secondInvite);

    const firstQueuedMessage = await queueProvider.dequeue('envoye');
    const secondQueuedMessage = await queueProvider.dequeue('envoye');

    expect(firstQueuedMessage?.body).toEqual(firstInvite);
    expect(secondQueuedMessage?.body).toEqual(secondInvite);
  });

  it('keeps product queues isolated', async () => {
    const queueProvider = new InMemoryQueueProvider();
    const inviteJob = inviteEnvelope('workspace-kobo');
    const geofenceJob: JobEnvelope = {
      id: 'geofence-1',
      name: 'fahari.geofence-alert',
      payload: { deviceId: 'device-1' },
      enqueuedAt: '2026-09-12T12:00:00.000Z',
    };

    await queueProvider.enqueue('envoye', inviteJob);
    await queueProvider.enqueue('fahari', geofenceJob);

    expect(await queueProvider.dequeue('fahari')).toMatchObject({
      body: geofenceJob,
    });
    expect(await queueProvider.dequeue('envoye')).toMatchObject({
      body: inviteJob,
    });
  });

  it('does not redeliver after ack', async () => {
    const queueProvider = new InMemoryQueueProvider();
    await queueProvider.enqueue('envoye', inviteEnvelope('workspace-kobo'));

    const queuedMessage = await queueProvider.dequeue('envoye');
    expect(queuedMessage).not.toBeNull();
    if (!queuedMessage) {
      return;
    }
    await queueProvider.ack(queuedMessage);

    expect(await queueProvider.dequeue('envoye')).toBeNull();
  });

  it('redelivers an unacked message and increments receiveCount', async () => {
    const queueProvider = new InMemoryQueueProvider(0);
    await queueProvider.enqueue('envoye', inviteEnvelope('workspace-kobo'));

    const firstDelivery = await queueProvider.dequeue('envoye');
    expect(firstDelivery?.receiveCount).toBe(1);

    const redelivery = await queueProvider.dequeue('envoye');
    expect(redelivery?.receipt).toBe(firstDelivery?.receipt);
    expect(redelivery?.receiveCount).toBe(2);
    expect(redelivery?.body).toEqual(firstDelivery?.body);
  });

  it('returns null when the queue is empty', async () => {
    const queueProvider = new InMemoryQueueProvider();
    expect(await queueProvider.dequeue('envoye')).toBeNull();
  });
});
