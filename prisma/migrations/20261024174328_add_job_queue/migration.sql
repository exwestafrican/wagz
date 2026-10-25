-- CreateEnum
CREATE TYPE "QueuedJobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "queued_job" (
    "id" BIGSERIAL NOT NULL,
    "taskName" VARCHAR(100) NOT NULL,
    "params" JSONB NOT NULL DEFAULT '{}',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "lastRunAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "status" "QueuedJobStatus" NOT NULL DEFAULT 'PENDING',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maximumRetries" INTEGER NOT NULL DEFAULT 5,
    "errorCode" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "queued_job_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "queued_job_status_scheduledAt_idx" ON "queued_job"("status", "scheduledAt");
