-- CreateTable
CREATE TABLE "FeatureVotes" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "featureId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureVotes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FeatureVotes_email_idx" ON "FeatureVotes"("email");

-- CreateIndex
CREATE INDEX "FeatureVotes_featureId_idx" ON "FeatureVotes"("featureId");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureVotes_email_featureId_key" ON "FeatureVotes"("email", "featureId");

-- AddForeignKey
ALTER TABLE "FeatureVotes" ADD CONSTRAINT "FeatureVotes_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "Feature"("id") ON DELETE CASCADE ON UPDATE CASCADE;
