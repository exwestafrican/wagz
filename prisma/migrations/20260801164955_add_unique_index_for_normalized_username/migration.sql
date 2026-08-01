/*
  Warnings:

  - A unique constraint covering the columns `[workspaceCode,normalizedUsername]` on the table `teammate` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "teammate_workspaceCode_normalizedUsername_key" ON "teammate"("workspaceCode", "normalizedUsername");
