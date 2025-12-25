/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `Feature` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Feature_name_key" ON "Feature"("name");
