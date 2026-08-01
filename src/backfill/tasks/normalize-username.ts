import { Teammate, Workspace } from '@/generated/prisma/client';
import BackfillTask from '@/backfill/task';
import { PrismaService } from '@/prisma/prisma.service';
import { Logger } from '@nestjs/common';

export class NormalizeUsernames implements BackfillTask {
  logger = new Logger(NormalizeUsernames.name);

  constructor(private readonly prismaService: PrismaService) {}

  async run(workspace: Workspace) {
    const teammates: Teammate[] = await this.prismaService.teammate.findMany({
      where: {
        workspace: workspace,
      },
      orderBy: {
        id: 'asc',
      },
    });

    for (const teammate of teammates) {
      if (teammate.username) {
        await this.prismaService.teammate.update({
          where: { id: teammate.id },
          data: {
            normalizedUsername: this.normalizeUsername(teammate.username),
          },
        });
        this.logger.log(
          `Successfully normalized username for teammate; id=${teammate.id}`,
        );
      } else {
        this.logger.warn(`Teammate has no username; id=${teammate.id}`);
      }
    }
  }

  private normalizeUsername(username: string) {
    return username.split('.').join('');
  }
}
