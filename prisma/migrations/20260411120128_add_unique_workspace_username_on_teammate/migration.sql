/*
  Warnings:

  - A unique constraint covering the columns `[workspaceCode,username]` on the table `teammate` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "teammate_workspaceCode_username_key" ON "teammate"("workspaceCode", "username");
