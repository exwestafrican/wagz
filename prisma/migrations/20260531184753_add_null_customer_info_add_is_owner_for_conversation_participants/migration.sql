-- AlterTable
ALTER TABLE "conversation" ALTER COLUMN "customerInfo" DROP NOT NULL;

-- AlterTable
ALTER TABLE "conversation_participant" ADD COLUMN     "isOwner" BOOLEAN NOT NULL DEFAULT false;
