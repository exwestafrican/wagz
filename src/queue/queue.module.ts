import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SQSClient } from '@aws-sdk/client-sqs';
import { ENVIROMENT } from '@/common/const';
import { InMemoryQueueProvider } from '@/queue/in-memory-queue-provider';
import { JOB_QUEUE, JobQueue } from '@/queue/job-queue';
import { JobRouter } from '@/queue/job-router';
import { QUEUE_PROVIDER, type QueueProvider } from '@/queue/queue-provider';
import { SqsQueueProvider } from '@/queue/sqs-queue-provider';

export const QueueProviderFactory = {
  provide: QUEUE_PROVIDER,
  inject: [ConfigService],
  useFactory: (configService: ConfigService): QueueProvider => {
    switch (configService.get('NODE_ENV')) {
      case ENVIROMENT.PRODUCTION: {
        const awsRegion = configService.get<string>('AWS_REGION', '');
        const envoyeQueueUrl = configService.get<string>(
          'SQS_ENVOYE_QUEUE_URL',
          '',
        );
        const fahariQueueUrl = configService.get<string>(
          'SQS_FAHARI_QUEUE_URL',
          '',
        );
        if (!awsRegion || !envoyeQueueUrl || !fahariQueueUrl) {
          throw new Error(
            'SQS_ENVOYE_QUEUE_URL, SQS_FAHARI_QUEUE_URL, and AWS_REGION are required in production',
          );
        }
        return new SqsQueueProvider(new SQSClient({ region: awsRegion }), {
          envoye: envoyeQueueUrl,
          fahari: fahariQueueUrl,
        });
      }
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
    {
      provide: JobRouter,
      useFactory: () => new JobRouter(),
    },
    JobQueue,
    {
      provide: JOB_QUEUE,
      useExisting: JobQueue,
    },
  ],
  exports: [QUEUE_PROVIDER, JOB_QUEUE, JobQueue],
})
export class QueueModule {}
