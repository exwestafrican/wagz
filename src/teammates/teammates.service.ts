import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { TeammateStatus } from '@/generated/prisma/enums';
import { Teammate } from '@/generated/prisma/client';
import { TeammatesNotInSameWorkspace } from '@/common/exceptions/teammates-not-in-same-workspace';
import NotFoundInDb from '@/common/exceptions/not-found';

@Injectable()
export class TeammatesService {
  logger = new Logger(TeammatesService.name);

  constructor(private readonly prismaService: PrismaService) {}

  async getTeammates(
    workspaceCode: string,
    status: TeammateStatus,
  ): Promise<Teammate[]> {
    return this.prismaService.teammate.findMany({
      where: { workspaceCode, status },
    });
  }

  async getMyTeammateProfile(
    workspaceCode: string,
    email: string,
  ): Promise<Teammate> {
    return this.prismaService.teammate.findUniqueOrThrow({
      where: {
        workspaceCode_email: { workspaceCode, email },
      },
    });
  }

  async primaryWorkspace(email: string) {
    // primary workspace for now is the oldest active workspace
    return this.prismaService.workspace.findFirstOrThrow({
      where: {
        teammates: {
          some: {
            email,
            status: TeammateStatus.ACTIVE,
          },
        },
      },
      orderBy: {
        createdAt: 'asc', //from oldest to newest
      },
    });
  }

  async usernameAlreadyExistsInWorkspace(
    workspaceCode: string,
    username: string,
  ) {
    const exists = await this.prismaService.teammate.findUnique({
      where: {
        workspaceCode_username: {
          workspaceCode,
          username,
        },
      },
      select: { id: true },
    });
    return !!exists;
  }

  async runIfTeammatesInSameWorkspace<T>(
    anchorTeammateId: number,
    teammateIds: number[],
    action: (
      anchorTeammateId: number,
      teammateIds: number[],
      workspaceCode: string,
    ) => Promise<T>,
  ): Promise<T> {
    const mapping = await this.prismaService.teammate.findMany({
      where: {
        id: {
          in: [anchorTeammateId, ...teammateIds],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        workspaceCode: true,
      },
      distinct: ['workspaceCode'],
    });

    const workspaceCodes = mapping.map((m) => m.workspaceCode);

    if (workspaceCodes.length > 1) {
      throw new TeammatesNotInSameWorkspace(
        `Teammates span multiple workspaces; anchorTeammateId=${anchorTeammateId} teammateIds=[${teammateIds.join(', ')}]`,
      );
    }

    if (workspaceCodes.length === 0) {
      throw new NotFoundInDb(
        `No teammates found; anchorTeammateId=${anchorTeammateId} teammateIds=[${teammateIds.join(', ')}]`,
      );
    }

    return await action(anchorTeammateId, teammateIds, workspaceCodes[0]);
  }
}
