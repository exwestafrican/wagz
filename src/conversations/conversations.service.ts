import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { Conversation } from '@/generated/prisma/client';

@Injectable()
export class ConversationsService {
  constructor(private readonly prisma: PrismaService) {}

  async createConversation(
    dto: CreateConversationDto,
    senderEmail: string,
  ): Promise<Conversation> {
    const sender = await this.prisma.teammate.findFirstOrThrow({
      where: { workspaceCode: dto.workspaceCode, email: senderEmail },
    });

    return this.prisma.$transaction(async (tx) => {
      const conversation = await tx.conversation.create({
        data: {
          workspaceCode: dto.workspaceCode
        },
      });

      await tx.conversationParticipant.createMany({
        data: [
          {
            workspaceCode: dto.workspaceCode,
            conversationId: conversation.id,
            teammateId: sender.id,
            isOwner: true
          },
          {
            workspaceCode: dto.workspaceCode,
            conversationId: conversation.id,
            teammateId: dto.recipientTeammateId,
          }
        ],
      });

      return conversation;
    });
  }

  async createSelfConversation(
    workspaceCode: string,
    teammateId: number,
  ): Promise<Conversation> {
    return this.prisma.$transaction(async (tx) => {
      const conversation = await tx.conversation.create({
        data: {
          workspaceCode,
        },
      });

      await tx.conversationParticipant.create({
        data: {
          workspaceCode,
          conversationId: conversation.id,
          teammateId,
          isOwner: true,
        },
      });

      return conversation;
    });
  }
}
