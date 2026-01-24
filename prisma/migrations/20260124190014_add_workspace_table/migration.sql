-- CreateEnum
CREATE TYPE "WorkspaceStatus" AS ENUM ('ACTIVE', 'DISABLED', 'DELETED');

-- CreateTable
CREATE TABLE "workspace" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "status" "WorkspaceStatus" NOT NULL DEFAULT 'ACTIVE',
    "ownedById" INTEGER NOT NULL,
    "code" VARCHAR(6) NOT NULL,
    "hasActivePlan" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workspace_code_idx" ON "workspace"("code");

-- AddForeignKey
ALTER TABLE "workspace" ADD CONSTRAINT "workspace_ownedById_fkey" FOREIGN KEY ("ownedById") REFERENCES "company_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
