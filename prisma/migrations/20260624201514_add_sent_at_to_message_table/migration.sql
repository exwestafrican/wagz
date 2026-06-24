-- AlterTable
ALTER TABLE "message" ADD COLUMN     "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "message_conversationId_sentAt_idx" ON "message"("conversationId", "sentAt");
