/*
  Warnings:

  - You are about to drop the column `participant_signature` on the `conversation` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "conversation_workspaceCode_participant_signature_idx";

-- DropIndex
DROP INDEX "conversation_participant_conversationId_teammateId_idx";

-- AlterTable
ALTER TABLE "conversation" DROP COLUMN "participant_signature",
ADD COLUMN     "participantSignature" TEXT;

-- CreateIndex
CREATE INDEX "conversation_workspaceCode_participantSignature_idx" ON "conversation"("workspaceCode", "participantSignature");
