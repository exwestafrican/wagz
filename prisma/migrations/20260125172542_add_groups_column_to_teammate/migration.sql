-- AlterTable
ALTER TABLE "teammate" ADD COLUMN     "groups" TEXT[] DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "updatedAt" DROP DEFAULT;
