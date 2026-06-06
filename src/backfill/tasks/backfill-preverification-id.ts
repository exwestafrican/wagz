import { PrismaService } from '@/prisma/prisma.service';
import BackfillTask from '../task';
import { Workspace } from '@/generated/prisma/client';

export class BackfillPreverificationId implements BackfillTask {
  constructor(private readonly prismaService: PrismaService) {}

  async run(workspace: Workspace) {
    const companyProfile =
      await this.prismaService.companyProfile.findFirstOrThrow({
        where: {
          id: workspace.ownedById,
        },
      });

    const preVerification =
      await this.prismaService.preVerification.findFirstOrThrow({
        where: {
          email: companyProfile.pointOfContactEmail,
        },
      });

    companyProfile.preVerificationId = preVerification.id;
  }
}
