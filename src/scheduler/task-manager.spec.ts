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

  async function createPendingRideRequestJob(rideRequestId: number) {
    return prismaService.queuedJob.create({
      data: {
        taskName: TaskQueue.NEW_RIDE_REQUEST,
        params: { rideRequestId, experienceCode: 'resort' },
        scheduledAt: new Date(),
        status: QueuedJobStatus.PENDING,
      },
    });
  }

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

  it('does not complete a job when its task is paused', async () => {
    const rideRequestJob = await createPendingRideRequestJob(1);
    runRideRequest.mockResolvedValue(undefined);

    const claimedJobs = await taskManager.claimPendingJobs();
    for (const claimedJob of claimedJobs) {
      await taskManager.processJob(claimedJob);
    }

    const completedJob = await prismaService.queuedJob.findUniqueOrThrow({
      where: { id: rideRequestJob.id },
    });
    expect(completedJob.status).toBe(QueuedJobStatus.COMPLETED);

    const pausedRideRequestJob = await createPendingRideRequestJob(2);
    await prismaService.pausedTask.create({
      data: { taskName: TaskQueue.NEW_RIDE_REQUEST },
    });

    const claimedJobsAfterPause = await taskManager.claimPendingJobs();
    for (const claimedJob of claimedJobsAfterPause) {
      await taskManager.processJob(claimedJob);
    }

    const skippedJob = await prismaService.queuedJob.findUniqueOrThrow({
      where: { id: pausedRideRequestJob.id },
    });
    expect(skippedJob.status).toBe(QueuedJobStatus.PENDING);
    expect(skippedJob.completedAt).toBeNull();
  });
});
