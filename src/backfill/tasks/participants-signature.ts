import BackfillTask from '@/backfill/task';
import { Logger } from '@nestjs/common';
import { Workspace } from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { ConversationsService } from '@/conversations/conversations.service';

export class ConversationParticipantsSignature implements BackfillTask {
  logger = new Logger(ConversationParticipantsSignature.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly conversationService: ConversationsService,
  ) {}

  async run(workspace: Workspace): Promise<void> {
    // fetch all conversations if participant count <=2 run logic
    const conversations = await this.prismaService.conversation.findMany({
      where: {
        workspaceCode: workspace.code,
      },
    });

    for (const conversation of conversations) {
      const participants =
        await this.prismaService.conversationParticipant.findMany({
          where: {
            workspaceCode: conversation.workspaceCode,
            conversationId: conversation.id,
          },
        });
      if (participants.length <= 2) {
        const teammateIds = participants.map(
          (participant) => participant.teammateId,
        );
        const signature = this.conversationService.participantSignature(
          workspace.code,
          teammateIds,
        );
        await this.prismaService.conversation.update({
          where: { id: conversation.id },
          data: { participantSignature: signature },
        });

        this.logger.log(
          `updated conversation signature; conversationId=${conversation.id} participantSignature=${signature} `,
        );
      } else {
        await this.prismaService.conversation.update({
          where: { id: conversation.id },
          data: { participantSignature: null },
        });
        this.logger.log(
          `skipping conversation with more than 2 participants; conversationId=${conversation.id} participantCount=${participants.length}`,
        );
      }
    }
  }
}
