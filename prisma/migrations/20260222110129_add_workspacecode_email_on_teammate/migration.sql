/*
  Warnings:

  - A unique constraint covering the columns `[workspaceCode,email]` on the table `teammate` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "teammate_workspaceCode_email_key" ON "teammate"("workspaceCode", "email");
