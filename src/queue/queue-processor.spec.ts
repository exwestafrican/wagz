import { JobEnvelope } from '@/queue/job';
import { createHandlerRegistry } from '@/queue/handler-registry';
import { InMemoryQueueProvider } from '@/queue/in-memory-queue-provider';
import { JobQueue } from '@/queue/job-queue';
import { JobRouter } from '@/queue/job-router';
import { QueueProcessor } from '@/queue/queue-processor';

describe('QueueProcessor', () => {
  it('runs a handler and acks on success', async () => {
    const queueProvider = new InMemoryQueueProvider();
    const handlerRegistry = createHandlerRegistry();
    const processedWorkspaceIds: string[] = [];
    handlerRegistry.register({
      name: 'envoye.send-invite',
      handle: (payload) => {
        const invitePayload = payload as { workspaceId: string };
        processedWorkspaceIds.push(invitePayload.workspaceId);
        return Promise.resolve();
      },
    });
    const jobQueue = new JobQueue(queueProvider, new JobRouter());
    const queueProcessor = new QueueProcessor(queueProvider, handlerRegistry);

    await jobQueue.enqueue('envoye.send-invite', {
      workspaceId: 'workspace-kobo',
    });

    await expect(queueProcessor.processOnce('envoye')).resolves.toBe(
      'processed',
    );
    expect(processedWorkspaceIds).toEqual(['workspace-kobo']);
    expect(await queueProvider.dequeue('envoye')).toBeNull();
  });

  it('does not ack when the handler throws', async () => {
    const queueProvider = new InMemoryQueueProvider(0);
    const handlerRegistry = createHandlerRegistry();
    handlerRegistry.register({
      name: 'envoye.send-invite',
      handle: () => Promise.reject(new Error('invite failed')),
    });
    const jobQueue = new JobQueue(queueProvider, new JobRouter());
    const queueProcessor = new QueueProcessor(queueProvider, handlerRegistry);

    await jobQueue.enqueue('envoye.send-invite', {
      workspaceId: 'workspace-kobo',
    });

    await expect(queueProcessor.processOnce('envoye')).resolves.toBe('retry');

    const redeliveredMessage = await queueProvider.dequeue('envoye');
    expect(redeliveredMessage?.body.payload).toEqual({
      workspaceId: 'workspace-kobo',
    });
    expect(redeliveredMessage?.receiveCount).toBe(2);
  });

  it('acks an unknown job after the receive limit', async () => {
    const queueProvider = new InMemoryQueueProvider(0);
    const handlerRegistry = createHandlerRegistry();
    const queueProcessor = new QueueProcessor(queueProvider, handlerRegistry);
    queueProcessor.unknownJobReceiveLimit = 3;

    const unknownJob: JobEnvelope = {
      id: 'unknown-job-1',
      name: 'envoye.missing-handler',
      payload: {},
      enqueuedAt: '2026-09-12T12:00:00.000Z',
    };
    await queueProvider.enqueue('envoye', unknownJob);

    await expect(queueProcessor.processOnce('envoye')).resolves.toBe('retry');
    await expect(queueProcessor.processOnce('envoye')).resolves.toBe('retry');
    await expect(queueProcessor.processOnce('envoye')).resolves.toBe('retry');

    expect(await queueProvider.dequeue('envoye')).toBeNull();
  });

  it('returns idle when the queue is empty', async () => {
    const queueProvider = new InMemoryQueueProvider();
    const queueProcessor = new QueueProcessor(
      queueProvider,
      createHandlerRegistry(),
    );

    await expect(queueProcessor.processOnce('envoye')).resolves.toBe('idle');
  });

  it('stops the run loop when aborted', async () => {
    const queueProvider = new InMemoryQueueProvider();
    const queueProcessor = new QueueProcessor(
      queueProvider,
      createHandlerRegistry(),
    );
    queueProcessor.idlePollIntervalMs = 1;
    const abortController = new AbortController();

    const runLoop = queueProcessor.run(abortController.signal, ['envoye']);
    abortController.abort();
    await runLoop;
  });
});
