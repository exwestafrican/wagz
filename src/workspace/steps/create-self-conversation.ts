import { Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { WorkspaceDetails } from '@/workspace/domain/workspace-details';
import { PostSetupStep } from '@/workspace/steps/postsetup-step';
import { ConversationsService } from '@/conversations/conversations.service';

export class CreateSelfConversationStep implements PostSetupStep {
  logger = new Logger(CreateSelfConversationStep.name);

  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly prismaService: PrismaService,
  ) {}

  async execute(workspaceDetails: WorkspaceDetails): Promise<void> {
    const admin = await this.prismaService.teammate.findFirstOrThrow({
      where: {
        workspaceCode: workspaceDetails.code,
        email: workspaceDetails.pointOfContact.email,
      },
    });

    const conversation = await this.conversationsService.createSelfConversation(
      workspaceDetails.code,
      admin.id,
    );

    this.logger.log(
      `Successfully created self-conversation for admin; workspaceCode=${workspaceDetails.code} conversationId=${conversation.id}`,
    );
  }

  async compensate(workspaceDetails: WorkspaceDetails): Promise<void> {
    this.logger.warn(
      `Removing self-conversation as compensating action; workspaceCode=${workspaceDetails.code}`,
    );
    await this.prismaService.conversation.deleteMany({
      where: { workspaceCode: workspaceDetails.code },
    });
  }
}
