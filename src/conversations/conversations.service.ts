import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { notInDbError } from '@/common/error-type';
import { Teammate } from '@/generated/prisma/client';
import { render } from '@react-email/render';
import NewMessageNotificationTemplate from '@/emails/templates/new-message-notification.template';
import React from 'react';
import { fullName } from '@/teammates/utils/full-name';
import { EMAIL_CLIENT, type EmailClient } from '@/messaging/email/email-client';
import { faker } from '@faker-js/faker';
import { quotes } from '@/conversations/messangers/quotes';
import { LinkService } from '@/common/link-service';
import cleanWorkspaceName from '@/workspace/utils/CleanWorkspaceName';

@Injectable()
export class ConversationsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(EMAIL_CLIENT) private readonly emailClient: EmailClient,
    private readonly linkService: LinkService,
  ) {}

  async runIfConversationParticipant<T>(
    conversationId: number,
    teammateId: number,
    action: () => Promise<T>,
  ): Promise<T> {
    try {
      await this.prisma.conversationParticipant.findFirstOrThrow({
        where: { conversationId, teammateId },
        select: { id: true },
      });
      return action();
    } catch (error) {
      if (notInDbError(error)) {
        throw new NotFoundException();
      }
      throw error;
    }
  }

  async notifyRecipients(
    workspaceCode: string,
    conversationId: number,
    sender: Teammate,
    message: string,
  ) {
    //TODO: debounce notification for 5 minutes
    const randomNumber = faker.number.int({ min: 0, max: 1 });
    const workspace = await this.prisma.workspace.findFirstOrThrow({
      where: {
        code: workspaceCode,
      },
    });
    const recipients = await this.prisma.conversationParticipant.findMany({
      include: { teammate: true },
      where: {
        conversationId,
        teammateId: {
          not: sender.id,
        },
      },
    });

    const conversationUrl = this.linkService.conversationUrl(
      workspaceCode,
      conversationId,
    );

    const workspaceName = cleanWorkspaceName(workspace);

    for (const recipient of recipients) {
      const emailHtml = await render(
        React.createElement(NewMessageNotificationTemplate, {
          workspaceName: workspaceName,
          senderName: sender.firstName,
          message: message,
          url: conversationUrl,
          quote: quotes[randomNumber],
        }),
      );

      await this.emailClient.send({
        from: {
          email: `${workspaceName.toLowerCase()}+notifications@envoye.co`,
          name: fullName(sender),
        },
        to: {
          email: recipient.teammate.email,
          name: fullName(recipient.teammate),
        },
        subject: `${sender.firstName} envoyed you 📬`,
        html: emailHtml,
      });
    }
  }
}
