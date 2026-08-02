/*
  Warnings:

  - Made the column `preVerificationId` on table `company_profiles` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "company_profiles" DROP CONSTRAINT "company_profiles_preVerificationId_fkey";

-- AlterTable
ALTER TABLE "company_profiles" ALTER COLUMN "preVerificationId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "company_profiles" ADD CONSTRAINT "company_profiles_preVerificationId_fkey" FOREIGN KEY ("preVerificationId") REFERENCES "PreVerification"("id") ON DELETE CASCADE ON UPDATE CASCADE;
