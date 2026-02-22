-- DropForeignKey
ALTER TABLE "teammate" DROP CONSTRAINT "teammate_workspaceId_fkey";

-- DropIndex
DROP INDEX "teammate_email_workspaceId_key";

-- AlterTable
ALTER TABLE "teammate" ALTER COLUMN "workspaceId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "teammate" ADD CONSTRAINT "teammate_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;
