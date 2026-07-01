import { PrismaService } from '@/prisma/prisma.service';

export async function ensureImpersonationSessionTable(
  prismaService: PrismaService,
): Promise<void> {
  await prismaService.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "impersonation_session" (
      "id" TEXT NOT NULL,
      "actorEmail" VARCHAR(255) NOT NULL,
      "subjectTeammateId" INTEGER NOT NULL,
      "workspaceCode" VARCHAR(6) NOT NULL,
      "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "expiresAt" TIMESTAMP(3) NOT NULL,
      "endedAt" TIMESTAMP(3),
      CONSTRAINT "impersonation_session_pkey" PRIMARY KEY ("id")
    )
  `);
  await prismaService.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "impersonation_session_actorEmail_endedAt_idx"
    ON "impersonation_session"("actorEmail", "endedAt")
  `);
}
