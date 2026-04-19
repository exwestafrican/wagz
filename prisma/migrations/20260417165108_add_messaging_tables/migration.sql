-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('open', 'frozen', 'resolved', 'closed');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('text', 'image');

-- CreateTable
CREATE TABLE "conversation" (
    "id" SERIAL NOT NULL,
    "workspaceCode" VARCHAR(6) NOT NULL,
    "status" "ConversationStatus" NOT NULL DEFAULT 'open',
    "subject" VARCHAR(100),
    "customerInfo" VARCHAR(100) NOT NULL,
    "lastMessage" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_participant" (
    "id" SERIAL NOT NULL,
    "workspaceCode" VARCHAR(6) NOT NULL,
    "conversationId" INTEGER NOT NULL,
    "teammateId" INTEGER NOT NULL,
    "lastReadMessage" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversation_participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message" (
    "id" SERIAL NOT NULL,
    "workspaceCode" VARCHAR(6) NOT NULL,
    "conversationId" INTEGER NOT NULL,
    "content" VARCHAR(65000) NOT NULL,
    "url" VARCHAR(2000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "messagetype" "MessageType" NOT NULL DEFAULT 'text',

    CONSTRAINT "message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "conversation_participant_workspaceCode_teammateId_idx" ON "conversation_participant"("workspaceCode", "teammateId");

-- CreateIndex
CREATE INDEX "conversation_participant_workspaceCode_conversationId_idx" ON "conversation_participant"("workspaceCode", "conversationId");

-- CreateIndex
CREATE INDEX "message_workspaceCode_conversationId_idx" ON "message"("workspaceCode", "conversationId");

-- AddForeignKey
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_workspaceCode_fkey" FOREIGN KEY ("workspaceCode") REFERENCES "workspace"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_participant" ADD CONSTRAINT "conversation_participant_workspaceCode_fkey" FOREIGN KEY ("workspaceCode") REFERENCES "workspace"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_participant" ADD CONSTRAINT "conversation_participant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_participant" ADD CONSTRAINT "conversation_participant_teammateId_fkey" FOREIGN KEY ("teammateId") REFERENCES "teammate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_participant" ADD CONSTRAINT "conversation_participant_lastReadMessage_fkey" FOREIGN KEY ("lastReadMessage") REFERENCES "message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message" ADD CONSTRAINT "message_workspaceCode_fkey" FOREIGN KEY ("workspaceCode") REFERENCES "workspace"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message" ADD CONSTRAINT "message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
