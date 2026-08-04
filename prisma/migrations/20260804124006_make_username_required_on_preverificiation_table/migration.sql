/*
  Warnings:

  - Made the column `username` on table `PreVerification` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "PreVerification" ALTER COLUMN "username" SET NOT NULL;
