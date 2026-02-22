/*
  Warnings:

  - Added the required column `workspaceCode` to the `teammate` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "teammate" ADD COLUMN     "workspaceCode" TEXT NOT NULL;
