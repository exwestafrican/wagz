import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { SendMessageDto } from './dto/send-message.dto';
import { Message } from '@/generated/prisma/client';

@Injectable()
export class MessagesService {
  constructor(private readonly prisma: PrismaService) {}

  async sendMessage(
    conversationId: number,
    dto: SendMessageDto,
    senderEmail: string,
  ): Promise<Message> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const sender = await this.prisma.teammate.findFirst({
      where: { workspaceCode: conversation.workspaceCode, email: senderEmail },
    });
    if (!sender) {
      throw new ForbiddenException(
        'Sender is not a participant of this conversation',
      );
    }

    const participant = await this.prisma.conversationParticipant.findFirst({
      where: { conversationId, teammateId: sender.id },
    });
    if (!participant) {
      throw new ForbiddenException(
        'Sender is not a participant of this conversation',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const message = await tx.message.create({
        data: {
          workspaceCode: conversation.workspaceCode,
          conversationId,
          content: dto.content,
          senderTeammateId: sender.id,
        },
      });

      await tx.conversation.update({
        where: { id: conversationId },
        data: { lastMessage: message.id },
      });

      await tx.conversationParticipant.update({
        where: { id: participant.id },
        data: { lastReadMessage: message.id },
      });

      return message;
    });
  }
}
