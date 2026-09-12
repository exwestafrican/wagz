import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SQSClient } from '@aws-sdk/client-sqs';
import { ENVIROMENT } from '@/common/const';
import { InMemoryQueueProvider } from '@/queue/in-memory-queue-provider';
import { JOB_QUEUE, JobQueue } from '@/queue/job-queue';
import { QUEUE_PROVIDER, type QueueProvider } from '@/queue/queue-provider';
import { SQS_REGION, SqsQueueProvider } from '@/queue/sqs-queue-provider';

export const QueueProviderFactory = {
  provide: QUEUE_PROVIDER,
  inject: [ConfigService],
  useFactory: (configService: ConfigService): QueueProvider => {
    switch (configService.get('NODE_ENV')) {
      case ENVIROMENT.PRODUCTION:
        return new SqsQueueProvider(new SQSClient({ region: SQS_REGION }));
      default:
        return new InMemoryQueueProvider();
    }
  },
};

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    QueueProviderFactory,
    JobQueue,
    {
      provide: JOB_QUEUE,
      useExisting: JobQueue,
    },
  ],
  exports: [QUEUE_PROVIDER, JOB_QUEUE, JobQueue],
})
export class QueueModule {}
