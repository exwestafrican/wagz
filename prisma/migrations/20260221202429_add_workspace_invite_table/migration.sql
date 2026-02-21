-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'ACCEPTED');

-- CreateTable
CREATE TABLE "workspace_invite" (
    "id" SERIAL NOT NULL,
    "recipientEmail" VARCHAR(255) NOT NULL,
    "workspaceCode" TEXT NOT NULL,
    "inviteCode" VARCHAR(6) NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "senderId" INTEGER NOT NULL,
    "recipientRole" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validTill" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),

    CONSTRAINT "workspace_invite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workspace_invite_workspaceCode_idx" ON "workspace_invite"("workspaceCode");

-- AddForeignKey
ALTER TABLE "workspace_invite" ADD CONSTRAINT "workspace_invite_workspaceCode_fkey" FOREIGN KEY ("workspaceCode") REFERENCES "workspace"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_invite" ADD CONSTRAINT "workspace_invite_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "teammate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
