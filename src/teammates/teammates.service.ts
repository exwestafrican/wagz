import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { TeammateStatus } from '@/generated/prisma/enums';
import { ConversationParticipant, Teammate } from '@/generated/prisma/client';

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

  private conversationMetaData(
    conversationId: number,
    owner: ConversationParticipant,
    otherParticipant: ConversationParticipant,
  ) {
    return {
      id: conversationId,
      authorId: owner.teammateId,
      recipientId: otherParticipant.teammateId,
    };
  }
// create conversation method
  // send conversation method sendText(conversationId, message)
  async directMessages(code: string, email: string, limit = 7) {
    const teammate = await this.prismaService.teammate.findUniqueOrThrow({
      where: {
        workspaceCode_email: { workspaceCode: code, email },
      },
    });

    const conversations = await this.prismaService.conversation.findMany({
      where: {
        conversationParticipants: {
          some: {
            teammateId: teammate.id,
            workspaceCode: code,
          },
        },
      },
      include: {
        conversationParticipants: true,
      },
      orderBy: {
        updatedAt: 'desc', //TODO: this is temporary and we should be depending on lastMessageAt
      },
      take: limit,
    });

    return conversations
      .filter(
        (conversation) => conversation.conversationParticipants.length <= 2,
      )
      .map((conversation) => {
        const [firstParticipant, secondParticipant] =
          conversation.conversationParticipants;
        if (firstParticipant.isOwner) {
          return this.conversationMetaData(
            conversation.id,
            firstParticipant,
            secondParticipant,
          );
        } else {
          return this.conversationMetaData(
            conversation.id,
            secondParticipant,
            firstParticipant,
          );
        }
      });
  }
}
