-- AlterTable
ALTER TABLE "queued_job" ADD COLUMN     "processingEnabled" BOOLEAN NOT NULL DEFAULT true;
