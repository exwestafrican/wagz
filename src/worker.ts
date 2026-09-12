import { NestFactory } from '@nestjs/core';
import { QueueProcessor } from '@/queue/queue-processor';
import { WorkerModule } from '@/queue/worker.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule);
  const queueProcessor = app.get(QueueProcessor);
  const abortController = new AbortController();

  const shutdown = async () => {
    abortController.abort();
    await app.close();
  };

  process.once('SIGTERM', () => {
    void shutdown();
  });
  process.once('SIGINT', () => {
    void shutdown();
  });

  await queueProcessor.run(abortController.signal);
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
