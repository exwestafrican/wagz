-- CreateIndex
CREATE INDEX "conversation_participant_workspaceCode_teammateId_idx" ON "conversation_participant"("workspaceCode", "teammateId");

-- CreateIndex
CREATE INDEX "conversation_participant_workspaceCode_conversationId_idx" ON "conversation_participant"("workspaceCode", "conversationId");

-- CreateIndex
CREATE INDEX "message_workspaceCode_conversationId_idx" ON "message"("workspaceCode", "conversationId");
