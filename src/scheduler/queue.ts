import { InputJsonSerializable } from '@/scheduler/input-json-serializable';
import { PrismaService } from '@/prisma/prisma.service';
import { Injectable, Logger } from '@nestjs/common';
import { addSeconds } from 'date-fns';

@Injectable()
export default class Queue {
  logger = new Logger(Queue.name);

  constructor(private readonly prismaService: PrismaService) {}
  async add(taskName: string, params: InputJsonSerializable) {
    const job = await this.prismaService.queuedJob.create({
      data: {
        taskName: taskName,
        params: params.toInputJson(),
        scheduledAt: addSeconds(Date.now(), 30),
      },
    });
    this.logger.log(
      `Added job to queue jobId=${job.id}  taskName=${job.taskName}`,
    );
  }
}
