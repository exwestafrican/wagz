-- CreateIndex
CREATE INDEX "conversation_workspaceCode_participant_signature_idx" ON "conversation"("workspaceCode", "participant_signature");
