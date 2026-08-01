import { Conversation, Workspace } from '@/generated/prisma/client';
import Messenger from '@/conversations/messangers/messenger';

export type MessageHistory = {
  senderId: number;
  messages: string[];
  sentAt: Date;
};

export async function singeParticipantMessageHistory(
  workspace: Workspace,
  messenger: Messenger,
  chatHistory: MessageHistory[],
): Promise<Conversation> {
  const openingMessage = chatHistory[0];
  const otherMessages = chatHistory.slice(1);
  const recipientReply: MessageHistory | undefined = chatHistory.find(
    (h) => h.senderId !== openingMessage.senderId,
  );

  const recipientId = recipientReply?.senderId ?? 0;

  const conversation = await messenger.sendOpeningTextMessage(
    openingMessage.senderId,
    [recipientId],
    workspace.code,
    openingMessage.messages,
    openingMessage.sentAt,
  );

  for (const history of otherMessages) {
    await messenger.sendTextMessage(
      conversation.id,
      history.senderId,
      history.messages,
      history.sentAt,
    );
  }
  return conversation;
}
