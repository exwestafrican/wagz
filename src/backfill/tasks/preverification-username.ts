import BackfillTask from '@/backfill/task';
import { PrismaService } from '@/prisma/prisma.service';
import { Logger } from '@nestjs/common';
import { Workspace } from '@/generated/prisma/client';

export class BackfillPreverificationUsername implements BackfillTask {
  logger = new Logger(BackfillPreverificationUsername.name);

  constructor(private readonly prismaService: PrismaService) {}

  async run(workspace: Workspace): Promise<void> {
    const workspaceWithOwner =
      await this.prismaService.workspace.findUniqueOrThrow({
        where: { id: workspace.id },
        include: { ownedBy: { include: { preVerification: true } } },
      });

    const preVerification = workspaceWithOwner.ownedBy.preVerification;

    const teammate = await this.prismaService.teammate.findFirst({
      where: {
        workspaceCode: workspace.code,
        email: preVerification.email,
      },
    });

    if (!teammate) {
      this.logger.warn(
        `No teammate matching preverification email; workspaceCode=${workspace.code} preVerificationId=${preVerification.id}`,
      );
      return;
    }

    if (!teammate.username) {
      this.logger.warn(
        `Teammate has no username; teammateId=${teammate.id} preVerificationId=${preVerification.id}`,
      );
      return;
    }

    await this.prismaService.preVerification.update({
      where: { id: preVerification.id },
      data: { username: teammate.username },
    });

    this.logger.log(
      `Backfilled preverification username; preVerificationId=${preVerification.id} teammateId=${teammate.id}`,
    );
  }
}
