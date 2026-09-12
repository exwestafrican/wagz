import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { JOB_QUEUE, JobQueue } from '@/queue/job-queue';
import { QUEUE_PROVIDER, type QueueProvider } from '@/queue/queue-provider';
import { QueueModule } from '@/queue/queue.module';
import { InMemoryQueueProvider } from '@/queue/in-memory-queue-provider';

describe('QueueModule', () => {
  it('provides an in-memory queue outside production', async () => {
    const testingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot(), QueueModule],
    }).compile();

    const queueProvider = testingModule.get<QueueProvider>(QUEUE_PROVIDER);
    const jobQueue = testingModule.get<JobQueue>(JOB_QUEUE);

    expect(queueProvider).toBeInstanceOf(InMemoryQueueProvider);
    expect(jobQueue).toBeInstanceOf(JobQueue);

    await jobQueue.enqueue('process-transaction', { transactionId: 'txn-1' });
    const queuedMessage = await queueProvider.dequeue('process-transaction');
    expect(queuedMessage?.body.name).toBe('process-transaction');

    await testingModule.close();
  });
});
