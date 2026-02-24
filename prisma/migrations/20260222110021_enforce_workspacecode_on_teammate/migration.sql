/*
  Warnings:

  - Made the column `workspaceCode` on table `teammate` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "teammate" ALTER COLUMN "workspaceCode" SET NOT NULL;
