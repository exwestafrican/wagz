-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED');

-- CreateTable
CREATE TABLE "workspace_invite" (
    "id" SERIAL NOT NULL,
    "recipientEmail" VARCHAR(255) NOT NULL,
    "workspaceId" INTEGER NOT NULL,
    "inviteCode" VARCHAR(6) NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "senderId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validTill" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),

    CONSTRAINT "workspace_invite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workspace_invite_workspaceId_idx" ON "workspace_invite"("workspaceId");

-- AddForeignKey
ALTER TABLE "workspace_invite" ADD CONSTRAINT "workspace_invite_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_invite" ADD CONSTRAINT "workspace_invite_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "teammate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
