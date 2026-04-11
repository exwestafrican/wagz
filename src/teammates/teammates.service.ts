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
}
