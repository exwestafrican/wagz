-- AlterTable
ALTER TABLE "message" ADD COLUMN     "authorId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "message" ADD CONSTRAINT "message_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "teammate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
