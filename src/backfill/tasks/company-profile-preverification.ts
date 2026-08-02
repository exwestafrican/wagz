import BackfillTask from '@/backfill/task';
import { PrismaService } from '@/prisma/prisma.service';
import { Logger } from '@nestjs/common';
import { Workspace } from '@/generated/prisma/client';

export class BackfillCompanyProfilePreverification implements BackfillTask {
  logger = new Logger(BackfillCompanyProfilePreverification.name);

  constructor(private readonly prismaService: PrismaService) {}

  async run(workspace: Workspace): Promise<void> {
    const workspaceWithOwner =
      await this.prismaService.workspace.findUniqueOrThrow({
        where: { id: workspace.id },
        include: { ownedBy: true },
      });
    const companyProfile = workspaceWithOwner.ownedBy;

    const preVerification = await this.prismaService.preVerification.findFirst({
      where: {
        email: companyProfile.pointOfContactEmail,
        companyName: companyProfile.companyName,
      },
    });

    if (!preVerification) {
      this.logger.warn(
        `No preverification matching email and company name; companyProfileId=${companyProfile.id} email=${companyProfile.pointOfContactEmail} companyName=${companyProfile.companyName}`,
      );
      return;
    }

    await this.prismaService.companyProfile.update({
      where: { id: companyProfile.id },
      data: { preVerificationId: preVerification.id },
    });

    this.logger.log(
      `Linked company profile to preverification; companyProfileId=${companyProfile.id} preVerificationId=${preVerification.id}`,
    );
  }
}
