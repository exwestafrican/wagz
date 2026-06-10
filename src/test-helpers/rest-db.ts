import { PrismaService } from '@/prisma/prisma.service';

export async function resetDb(prismaService: PrismaService) {
  await prismaService.preVerification.deleteMany();
  await prismaService.featureFlag.deleteMany();
  await prismaService.workspace.deleteMany();
  await prismaService.companyProfile.deleteMany();
}
