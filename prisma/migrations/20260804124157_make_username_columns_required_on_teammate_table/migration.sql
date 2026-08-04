/*
  Warnings:

  - Made the column `username` on table `teammate` required. This step will fail if there are existing NULL values in that column.
  - Made the column `normalizedUsername` on table `teammate` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "teammate" ALTER COLUMN "username" SET NOT NULL,
ALTER COLUMN "normalizedUsername" SET NOT NULL;
