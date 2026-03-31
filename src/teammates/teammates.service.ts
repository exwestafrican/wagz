import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  TeammateResponseDto,
  toTeammateResponse,
} from '@/teammates/dto/teammate-response.dto';
import { TeammateStatus } from '@/generated/prisma/enums';
import { Prisma, Teammate } from '@/generated/prisma/client';
import PRISMA_CODES from '@/prisma/consts';
import NotFoundInDb from '@/common/exceptions/not-found';

@Injectable()
export class TeammatesService {
  logger = new Logger(TeammatesService.name);

  constructor(private readonly prismaService: PrismaService) {}

  async getTeammates(workspaceCode: string): Promise<TeammateResponseDto[]> {
    const teammates = await this.prismaService.teammate.findMany({
      where: {
        workspaceCode,
        status: TeammateStatus.ACTIVE,
      },
    });

    return teammates.map(toTeammateResponse);
  }

  async getMyTeammateProfile(
    workspaceCode: string,
    email: string,
  ): Promise<TeammateResponseDto> {
    let teammate: Teammate;
    try {
      teammate = await this.prismaService.teammate.findUniqueOrThrow({
        where: {
          workspaceCode_email: { workspaceCode, email },
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === PRISMA_CODES.NOT_FOUND
      ) {
        throw new NotFoundInDb('Teammate not found');
      }
      throw error;
    }
    if (teammate.status !== TeammateStatus.ACTIVE) {
      throw new NotFoundInDb('Teammate not found');
    }
    return toTeammateResponse(teammate);
  }
}
