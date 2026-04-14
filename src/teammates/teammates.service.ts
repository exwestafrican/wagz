import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { TeammateStatus } from '@/generated/prisma/enums';
import { Teammate } from '@/generated/prisma/client';

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
    const count = await this.prismaService.teammate.count({
      where: {
        workspaceCode,
        username,
      },
    });
    return count > 0;
  }
}
