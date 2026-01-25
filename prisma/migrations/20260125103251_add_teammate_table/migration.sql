-- CreateEnum
CREATE TYPE "TeammateStatus" AS ENUM ('ACTIVE', 'DELETED', 'DISABLED');

-- CreateTable
CREATE TABLE "teammate" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "firstName" VARCHAR(100) NOT NULL,
    "lastName" VARCHAR(100) NOT NULL,
    "workspaceId" INTEGER NOT NULL,
    "status" "TeammateStatus" NOT NULL DEFAULT 'ACTIVE',
    "avatarUrl" VARCHAR(600),

    CONSTRAINT "teammate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "teammate_email_workspaceId_key" ON "teammate"("email", "workspaceId");

-- AddForeignKey
ALTER TABLE "teammate" ADD CONSTRAINT "teammate_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
