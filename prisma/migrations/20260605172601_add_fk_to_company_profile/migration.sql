-- AlterTable
ALTER TABLE "company_profiles" ADD COLUMN     "preVerificationId" UUID;

-- AddForeignKey
ALTER TABLE "company_profiles" ADD CONSTRAINT "company_profiles_preVerificationId_fkey" FOREIGN KEY ("preVerificationId") REFERENCES "PreVerification"("id") ON DELETE SET NULL ON UPDATE CASCADE;
