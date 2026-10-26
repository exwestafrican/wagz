import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import TaskQueue from '@/scheduler/tasks';
import RideRequestWorker from '@/scheduler/workers/ride-request.worker';
import { JsonValue } from '@prisma/client/runtime/client';
import { isEmpty } from '@/common/utils';
import { QueuedJobStatus } from '@/generated/prisma/enums';
import { addMinutes } from 'date-fns/addMinutes';
import { setTimeout as sleep } from 'node:timers/promises';

type ClaimedJob = {
  id: bigint;
  taskName: string;
  params: JsonValue;
};

@Injectable()
export default class TaskManager implements OnModuleDestroy {
  logger = new Logger(TaskManager.name);
  private abortController: AbortController = new AbortController();
  private runRef: Promise<void>;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly rideRequestWorker: RideRequestWorker,
  ) {}

  private async claimPendingJobs(limit = 100): Promise<ClaimedJob[]> {
    return this.prismaService.$queryRaw<ClaimedJob[]>`
          UPDATE queued_job
          SET status = 'RUNNING',
          "startedAt" = 'NOW'
      WHERE id in (
          SELECT id
          FROM queued_job
          WHERE status = 'PENDING'
          AND "scheduledAt" <= NOW()
          ORDER BY "scheduledAt" ASC
          LIMIT ${limit}
          FOR UPDATE SKIP LOCKED
      )
      RETURNING id, "taskName", params`;
  }

  async processJob(job: ClaimedJob) {
    this.logger.log(`started jobs id=${job.id}`);
    try {
      switch (job.taskName) {
        case TaskQueue.NEW_RIDE_REQUEST:
          await this.rideRequestWorker.run(job.params);
          //TODO find a way to always run these two after each completed jobs
          await this.transitionToCompleted(job);
          this.logger.log(`Finished job id=${job.id}`);
          break;
        default: {
          const message = `Unsupported task name id=${job.id} name=${job.taskName}`;
          await this.scheduleJobForRetry(job, new Error(message));
          this.logger.error(message);
        }
      }
    } catch (error) {
      await this.scheduleJobForRetry(job, error as Error);
    }
  }

  private async transitionToCompleted(job: ClaimedJob) {
    await this.prismaService.queuedJob.update({
      where: { id: job.id },
      data: {
        status: QueuedJobStatus.COMPLETED,
        completedAt: new Date(),
      },
    });
  }

  private async scheduleJobForRetry(
    job: ClaimedJob,
    error: Error,
  ): Promise<void> {
    await this.prismaService.queuedJob.update({
      where: { id: job.id },
      data: {
        retryCount: { increment: 1 },
        status: QueuedJobStatus.PENDING,
        lastRunAt: new Date(),
        scheduledAt: addMinutes(Date.now(), 1),
        errorCode: error.name,
      },
    });
  }

  async run() {
    while (!this.abortController.signal.aborted) {
      const jobs = await this.claimPendingJobs();
      if (isEmpty(jobs)) {
        // sleep for 1 minute
        this.logger.log('No jobs to process, snoozing task manager'); //TODO: just add a metric counter here
        await sleep(60_000, undefined, {});
      } else {
        for (const job of jobs) {
          if (this.abortController.signal.aborted) break; //stop immediately we end things.

          await this.processJob(job);
        }
      }
    }
  }

  start() {
    this.logger.log(`starting up task manager to process jobs`);
    this.runRef ??= this.run();
  }

  async onModuleDestroy() {
    this.abortController.abort();
    await this.runRef;
    //TODO: change jobs states back to pending, for jobs running.
    await this.prismaService.queuedJob.updateMany({
      where: { status: QueuedJobStatus.RUNNING },
      data: { status: QueuedJobStatus.PENDING },
    });
  }
}
