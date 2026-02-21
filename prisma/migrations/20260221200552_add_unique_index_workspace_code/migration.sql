/*
  Warnings:

  - A unique constraint covering the columns `[code]` on the table `workspace` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "workspace_code_key" ON "workspace"("code");
