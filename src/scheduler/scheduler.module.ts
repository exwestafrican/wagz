import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import Queue from '@/scheduler/queue';
import TaskManager from '@/scheduler/task-manager';
import RideRequestWorker from '@/scheduler/workers/ride-request.worker';
import { FahariNotificationModule } from '@/fahari/notification/notification.module';

@Module({
  imports: [PrismaModule, FahariNotificationModule],
  controllers: [],
  providers: [Queue, TaskManager, RideRequestWorker],
  exports: [Queue, TaskManager, RideRequestWorker],
})
export default class SchedulerModule {}
