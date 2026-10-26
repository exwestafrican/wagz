import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { INestApplication } from '@nestjs/common';

import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';
import { createTestApp } from '@/test-helpers/test-app';
import { resetDb } from '@/test-helpers/rest-db';
import TaskManager from '@/scheduler/task-manager';
import RideRequestWorker from '@/scheduler/workers/ride-request.worker';
import TaskQueue from '@/scheduler/tasks';
import { QueuedJobStatus } from '@/generated/prisma/enums';

describe('TaskManager', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let taskManager: TaskManager;
  let runRideRequest: jest.Mock;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot(), PrismaModule],
      providers: [],
    }).compile();

    app = await createTestApp(module);
    prismaService = app.get(PrismaService);
    runRideRequest = jest.fn();
    taskManager = new TaskManager(prismaService, {
      run: runRideRequest,
    } as unknown as RideRequestWorker);
  });

  afterEach(async () => {
    await resetDb(prismaService);
    await app.close();
  });

  async function createRunningRideRequestJob() {
    return prismaService.queuedJob.create({
      data: {
        taskName: TaskQueue.NEW_RIDE_REQUEST,
        params: { rideRequestId: 1, experienceCode: 'resort' },
        scheduledAt: new Date(),
        startedAt: new Date(),
        status: QueuedJobStatus.RUNNING,
      },
    });
  }

  it('marks a job completed when the worker succeeds', async () => {
    const runningJob = await createRunningRideRequestJob();
    runRideRequest.mockResolvedValue(undefined);

    await taskManager.processJob({
      id: runningJob.id,
      taskName: runningJob.taskName,
      params: runningJob.params,
    });

    const completedJob = await prismaService.queuedJob.findUniqueOrThrow({
      where: { id: runningJob.id },
    });
    expect(completedJob.status).toBe(QueuedJobStatus.COMPLETED);
    expect(completedJob.completedAt).not.toBeNull();
  });

  it('returns a job to pending when the worker fails', async () => {
    const runningJob = await createRunningRideRequestJob();
    runRideRequest.mockRejectedValue(new Error('SMTP timeout'));

    await taskManager.processJob({
      id: runningJob.id,
      taskName: runningJob.taskName,
      params: runningJob.params,
    });

    const retriedJob = await prismaService.queuedJob.findUniqueOrThrow({
      where: { id: runningJob.id },
    });
    expect(retriedJob.status).toBe(QueuedJobStatus.PENDING);
    expect(retriedJob.retryCount).toBe(1);
    expect(retriedJob.lastRunAt).not.toBeNull();
    expect(retriedJob.errorCode).toBe('Error');
  });
});
