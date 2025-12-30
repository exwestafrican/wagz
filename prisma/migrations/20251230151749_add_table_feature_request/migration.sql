-- CreateEnum
CREATE TYPE "FeatureRequestPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateTable
CREATE TABLE "FeatureRequest" (
    "id" SERIAL NOT NULL,
    "description" VARCHAR(5000) NOT NULL,
    "requestedByUserEmail" VARCHAR(255) NOT NULL,
    "priority" "FeatureRequestPriority" NOT NULL DEFAULT 'LOW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FeatureRequest_requestedByUserEmail_idx" ON "FeatureRequest"("requestedByUserEmail");

-- CreateIndex
CREATE INDEX "FeatureRequest_priority_idx" ON "FeatureRequest"("priority");
