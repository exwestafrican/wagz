-- CreateTable
CREATE TABLE "workspace_features" (
    "featureFlagId" INTEGER NOT NULL,
    "workspaceCode" VARCHAR(6) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_features_pkey" PRIMARY KEY ("featureFlagId","workspaceCode")
);

-- CreateIndex
CREATE INDEX "workspace_features_workspaceCode_idx" ON "workspace_features"("workspaceCode");

-- AddForeignKey
ALTER TABLE "workspace_features" ADD CONSTRAINT "workspace_features_featureFlagId_fkey" FOREIGN KEY ("featureFlagId") REFERENCES "feature_flags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_features" ADD CONSTRAINT "workspace_features_workspaceCode_fkey" FOREIGN KEY ("workspaceCode") REFERENCES "workspace"("code") ON DELETE CASCADE ON UPDATE CASCADE;
