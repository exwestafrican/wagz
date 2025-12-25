-- CreateTable
CREATE TABLE "FeatureSubscription" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "featureId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FeatureSubscription_email_idx" ON "FeatureSubscription"("email");

-- CreateIndex
CREATE INDEX "FeatureSubscription_featureId_idx" ON "FeatureSubscription"("featureId");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureSubscription_email_featureId_key" ON "FeatureSubscription"("email", "featureId");

-- AddForeignKey
ALTER TABLE "FeatureSubscription" ADD CONSTRAINT "FeatureSubscription_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "Feature"("id") ON DELETE CASCADE ON UPDATE CASCADE;
