import { PrismaService } from '@/prisma/prisma.service';
import { ensureImpersonationSessionTable } from '@/test-helpers/impersonation-table';

export async function resetDb(prismaService: PrismaService) {
  await ensureImpersonationSessionTable(prismaService);
  await prismaService.impersonationSession.deleteMany();
  await prismaService.preVerification.deleteMany();
  await prismaService.featureFlag.deleteMany();
  await prismaService.workspace.deleteMany();
  await prismaService.companyProfile.deleteMany();
}
