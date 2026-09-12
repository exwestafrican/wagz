import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JobHandlerRegistryProvider } from '@/queue/handler-registry';
import { QueueModule } from '@/queue/queue.module';
import { QueueProcessor } from '@/queue/queue-processor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    QueueModule,
  ],
  providers: [JobHandlerRegistryProvider, QueueProcessor],
})
export class WorkerModule {}
