import { Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { WorkspaceDetails } from '@/workspace/domain/workspace-details';
import { PostSetupStep } from '@/workspace/steps/postsetup-step';
import EnvoyeMessenger from '@/conversations/messangers/envoye';

export class CreateSelfConversationStep implements PostSetupStep {
  logger = new Logger(CreateSelfConversationStep.name);

  constructor(
    private readonly messenger: EnvoyeMessenger,
    private readonly prismaService: PrismaService,
  ) {}

  async execute(workspaceDetails: WorkspaceDetails): Promise<void> {
    const admin = await this.prismaService.teammate.findFirstOrThrow({
      where: {
        workspaceCode: workspaceDetails.code,
        email: workspaceDetails.pointOfContact.email,
      },
    });

    const conversation = await this.messenger.sendOpeningTextMessage(
      admin.id,
      admin.id,
      admin.workspaceCode,
      [],
      new Date(),
    );

    this.logger.log(
      `Successfully created self-conversation for admin; workspaceCode=${workspaceDetails.code} conversationId=${conversation.id}`,
    );
  }

  async compensate(workspaceDetails: WorkspaceDetails): Promise<void> {
    await this.prismaService.conversation.deleteMany({
      where: { workspaceCode: workspaceDetails.code },
    });

    this.logger.warn(
      `Removing self-conversation as compensating action; workspaceCode=${workspaceDetails.code}`,
    );
  }
}
