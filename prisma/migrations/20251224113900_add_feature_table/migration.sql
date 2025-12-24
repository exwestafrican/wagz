-- CreateEnum
CREATE TYPE "FeatureStage" AS ENUM ('PLANNED', 'IN_PROGRESS');

-- CreateTable
CREATE TABLE "Feature" (
    "id" UUID NOT NULL,
    "name" VARCHAR(225) NOT NULL,
    "votes" SMALLINT NOT NULL,
    "icon" VARCHAR(15) NOT NULL,
    "stage" "FeatureStage" NOT NULL DEFAULT 'PLANNED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Feature_pkey" PRIMARY KEY ("id")
);
