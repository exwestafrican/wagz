import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { PermissionService } from '@/permission/permission.service';
import RequestUser, {
  ImpersonationContext,
} from '@/auth/domain/request-user';
import { ENVOYE_WORKSPACE_CODE } from '@/feature-flag/const';
import { PERMISSIONS } from '@/permission/types';
import { IMPERSONATION_SESSION_TTL_MS } from '@/impersonation/consts';
import {
  ImpersonationSession,
  Teammate,
} from '@/generated/prisma/client';
import { TeammateStatus } from '@/generated/prisma/enums';
import { notInDbError } from '@/common/error-type';

@Injectable()
export class ImpersonationService {
  logger = new Logger(ImpersonationService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly permissionService: PermissionService,
  ) {}

  async startSession(
    actorEmail: string,
    subjectTeammateId: number,
  ): Promise<{ session: ImpersonationSession; subjectTeammate: Teammate }> {
    return this.permissionService.runIfPermitted(
      RequestUser.of(actorEmail),
      ENVOYE_WORKSPACE_CODE,
      PERMISSIONS.IMPERSONATE,
      async () => {
        let subjectTeammate: Teammate;
        try {
          subjectTeammate =
            await this.prismaService.teammate.findUniqueOrThrow({
              where: { id: subjectTeammateId },
            });
        } catch (error) {
          if (notInDbError(error)) {
            throw new NotFoundException();
          }
          throw error;
        }

        if (subjectTeammate.status !== TeammateStatus.ACTIVE) {
          throw new ForbiddenException();
        }

        if (subjectTeammate.email === actorEmail) {
          throw new ForbiddenException();
        }

        await this.endActiveSessionsForActor(actorEmail);

        const expiresAt = new Date(Date.now() + IMPERSONATION_SESSION_TTL_MS);
        const session = await this.prismaService.impersonationSession.create({
          data: {
            actorEmail,
            subjectTeammateId,
            workspaceCode: subjectTeammate.workspaceCode,
            expiresAt,
          },
        });

        return { session, subjectTeammate };
      },
    );
  }

  async endSession(actorEmail: string, sessionId: string): Promise<void> {
    const session = await this.prismaService.impersonationSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.actorEmail !== actorEmail || session.endedAt) {
      throw new NotFoundException();
    }

    await this.prismaService.impersonationSession.update({
      where: { id: sessionId },
      data: { endedAt: new Date() },
    });
  }

  async getActiveSession(
    actorEmail: string,
  ): Promise<ImpersonationSession | null> {
    return this.prismaService.impersonationSession.findFirst({
      where: {
        actorEmail,
        endedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  }

  async resolveSession(
    sessionId: string,
    actorEmail: string,
  ): Promise<ImpersonationContext> {
    const session = await this.prismaService.impersonationSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.actorEmail !== actorEmail) {
      throw new UnauthorizedException();
    }

    if (session.endedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException();
    }

    return {
      sessionId: session.id,
      teammateId: session.subjectTeammateId,
      workspaceCode: session.workspaceCode,
    };
  }

  private async endActiveSessionsForActor(actorEmail: string): Promise<void> {
    await this.prismaService.impersonationSession.updateMany({
      where: {
        actorEmail,
        endedAt: null,
      },
      data: { endedAt: new Date() },
    });
  }
}
