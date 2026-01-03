-- CreateTable
CREATE TABLE "FeatureFeedback" (
    "id" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "featureId" UUID NOT NULL,

    CONSTRAINT "FeatureFeedback_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "FeatureFeedback" ADD CONSTRAINT "FeatureFeedback_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "Feature"("id") ON DELETE CASCADE ON UPDATE CASCADE;
