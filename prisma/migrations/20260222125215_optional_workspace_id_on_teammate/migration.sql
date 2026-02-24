-- DropForeignKey
ALTER TABLE "teammate" DROP CONSTRAINT "teammate_workspaceId_fkey";

-- DropIndex
DROP INDEX "teammate_email_workspaceId_key";

-- AlterTable
ALTER TABLE "teammate" ALTER COLUMN "workspaceId" DROP NOT NULL;
