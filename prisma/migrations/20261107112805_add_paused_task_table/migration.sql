-- CreateTable
CREATE TABLE "paused_task" (
    "taskName" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "paused_task_pkey" PRIMARY KEY ("taskName")
);
