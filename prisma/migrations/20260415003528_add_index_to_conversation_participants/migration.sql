-- CreateIndex
CREATE INDEX "conversation_participant_teammateId_idx" ON "conversation_participant"("teammateId");

-- CreateIndex
CREATE INDEX "conversation_participant_conversationId_idx" ON "conversation_participant"("conversationId");
