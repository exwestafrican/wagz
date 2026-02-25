-- AddForeignKey
ALTER TABLE "teammate" ADD CONSTRAINT "teammate_workspaceCode_fkey" FOREIGN KEY ("workspaceCode") REFERENCES "workspace"("code") ON DELETE CASCADE ON UPDATE CASCADE;
