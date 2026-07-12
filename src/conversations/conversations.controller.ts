import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { SupabaseAuthGuard } from '@/auth/guard/supabase.guard';
import { User } from '@/auth/decorator/user.decorator';
import RequestUser from '@/auth/domain/request-user';
import { PermissionService } from '@/permission/permission.service';
import { PERMISSIONS } from '@/permission/types';
import { TeammatesService } from '@/teammates/teammates.service';
import { ConversationsService } from '@/conversations/conversations.service';
import { CreateConversationDto } from '@/conversations/dto/create-conversation.dto';
import {
  ConversationResponseDto,
  toConversationResponse,
} from '@/conversations/dto/conversation-response.dto';
import { TeammatesNotInSameWorkspace } from '@/common/exceptions/teammates-not-in-same-workspace';
import NotFoundInDb from '@/common/exceptions/not-found';
import ApiBadRequestResponse from '@/common/decorators/bad-response';
import ApiForbiddenResponse from '@/common/decorators/forbidden-response';
import EnvoyeMessenger from '@/conversations/messangers/envoye';
import { SendTextMessageDto } from '@/conversations/dto/send-message.dto';
import { ListConversationsQueryDto } from '@/conversations/dto/list-conversations-query.dto';
import { ConversationMetadataResponseDto } from '@/conversations/dto/conversation-metadata-response.dto';
import { Conversation, Teammate } from '@/generated/prisma/client';
import { ChatHistoryQueryDto } from '@/conversations/dto/chat-history-query.dto';
import {
  ChatHistoryDto,
  toChatHistoryDto,
} from '@/conversations/dto/chat-history.dto';
import { isSame } from '@/common/utils';
import { UnreadMessageQueryDto } from '@/conversations/dto/unread-message-query.dto';
import { ConversationType } from '@/conversations/const';

@Controller('conversations')
export class ConversationsController {
  logger = new Logger(ConversationsController.name);

  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly teammatesService: TeammatesService,
    private readonly permissionService: PermissionService,
    private readonly messenger: EnvoyeMessenger,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List user conversations in a workspace' })
  @ApiQuery({
    name: 'workspaceCode',
    required: true,
    type: String,
    description: 'Workspace code',
    example: '12er56',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User conversations in the workspace',
    type: ConversationMetadataResponseDto,
    isArray: true,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User is unauthorized to make this request',
  })
  @ApiForbiddenResponse()
  @UseGuards(SupabaseAuthGuard)
  async listConversations(
    @User() requestUser: RequestUser,
    @Query() query: ListConversationsQueryDto,
  ): Promise<ConversationMetadataResponseDto[]> {
    return this.permissionService.runIfActiveWorkspaceMemberAndPermitted(
      requestUser,
      query.workspaceCode,
      PERMISSIONS.MESSAGE_TEAMMATES,
      (teammate) =>
        this.messenger.conversations(
          query.workspaceCode,
          teammate.id,
          query.conversationType || ConversationType.ALL,
        ),
    );
  }

  @Post('direct-message')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Start a direct message conversation' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Direct message conversation created',
    type: ConversationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User is unauthorized to make this request',
  })
  @ApiBadRequestResponse()
  @ApiForbiddenResponse()
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Recipient teammate not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description:
      'An ongoing conversation with these participants already exists',
  })
  @UseGuards(SupabaseAuthGuard)
  async createDirectMessage(
    @User() requestUser: RequestUser,
    @Body() dto: CreateConversationDto,
  ): Promise<ConversationResponseDto> {
    return this.permissionService.runIfActiveWorkspaceMemberAndPermitted(
      requestUser,
      dto.workspaceCode,
      PERMISSIONS.MESSAGE_TEAMMATES,
      async (senderTeammate) => {
        try {
          const conversation: Conversation =
            await this.teammatesService.runIfTeammatesInSameWorkspace(
              senderTeammate.id,
              dto.recipientTeammateIds,
              async (anchorTeammateId, teammateIds, workspaceCode) => {
                // send text or open message
                return await this.messenger.sendOpeningTextMessage(
                  anchorTeammateId,
                  teammateIds,
                  workspaceCode,
                  dto.openingMessage,
                  dto.sentAt,
                );
              },
            );

          await this.notifyRecipients(
            dto.workspaceCode,
            conversation.id,
            senderTeammate,
            dto.recipientTeammateIds,
            dto.openingMessage[0],
          );

          return toConversationResponse(conversation);
        } catch (error) {
          this.logger.error(`Error for workspace=${dto.workspaceCode}`);
          if (error instanceof TeammatesNotInSameWorkspace) {
            throw new BadRequestException();
          }
          if (error instanceof NotFoundInDb) {
            throw new NotFoundException();
          }
          throw error;
        }
      },
    );
  }

  private async notifyRecipients(
    workspaceCode: string,
    conversationId: number,
    senderTeammate: Teammate,
    recipientTeammateIds: number[],
    openingMessage: string,
  ) {
    const senderTeammateId = senderTeammate.id;
    if (
      recipientTeammateIds.length === 1 &&
      isSame(senderTeammateId, recipientTeammateIds[0])
    ) {
      return;
    }

    await this.conversationsService.notifyRecipients(
      workspaceCode,
      conversationId,
      senderTeammate,
      openingMessage,
    );
  }

  @Post('send-text')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Send text message to conversation' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Create Text for Conversation',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User is unauthorized to make this request',
  })
  @ApiBadRequestResponse()
  @ApiForbiddenResponse()
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Conversation not found',
  })
  @UseGuards(SupabaseAuthGuard)
  async sendTextMessage(
    @User() requestUser: RequestUser,
    @Body() dto: SendTextMessageDto,
  ) {
    await this.permissionService.runIfActiveWorkspaceMemberAndPermitted(
      requestUser,
      dto.workspaceCode,
      PERMISSIONS.MESSAGE_TEAMMATES,
      async (senderTeammate) => {
        await this.conversationsService.runIfConversationParticipant(
          dto.conversationId,
          senderTeammate.id,
          async () => {
            await this.messenger.sendTextMessage(
              dto.conversationId,
              senderTeammate.id,
              dto.message,
              dto.sentAt,
            );
            await this.conversationsService.notifyRecipients(
              dto.workspaceCode,
              dto.conversationId,
              senderTeammate,
              dto.message[0],
            );
          },
        );
      },
    );
  }

  @Get('chat-history')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Fetch paginated chat history for a conversation',
    description:
      'Returns up to 20 messages per request, ordered oldest to newest within each page. ' +
      'Omit lastMessageSentAt on the first request to load the most recent messages. ' +
      'To load older messages, pass lastMessageSentAt as the sentAt (milliseconds) of the first message in the current page. ' +
      'When fewer than 20 messages are returned, there is no more history.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Messages in chronological order within the page',
    type: ChatHistoryDto,
    isArray: true,
  })
  @ApiBadRequestResponse()
  @ApiForbiddenResponse()
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Conversation not found or requester is not a participant',
  })
  @UseGuards(SupabaseAuthGuard)
  async chatHistory(
    @User() requestUser: RequestUser,
    @Query() query: ChatHistoryQueryDto,
  ): Promise<ChatHistoryDto[]> {
    const history =
      await this.permissionService.runIfActiveWorkspaceMemberAndPermitted(
        requestUser,
        query.workspaceCode,
        PERMISSIONS.MESSAGE_TEAMMATES,
        async (requestTeammate) => {
          return this.conversationsService.runIfConversationParticipant(
            query.conversationId,
            requestTeammate.id,
            async () =>
              await this.messenger.chatHistory(
                query.conversationId,
                20,
                query.lastMessageSentAt,
              ),
          );
        },
      );
    return history.map((msg) => toChatHistoryDto(msg));
  }

  @Get('unread-messages')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Fetch all unread messages for teammate for a given conversation',
  })
  @ApiBadRequestResponse()
  @ApiForbiddenResponse()
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Conversation not found or requester is not a participant',
  })
  @UseGuards(SupabaseAuthGuard)
  async unreadMessages(
    @User() requestUser: RequestUser,
    @Query() query: UnreadMessageQueryDto,
  ): Promise<ChatHistoryDto[]> {
    const unreadMsgHistory =
      await this.permissionService.runIfActiveWorkspaceMemberAndPermitted(
        requestUser,
        query.workspaceCode,
        PERMISSIONS.MESSAGE_TEAMMATES,
        async (requestTeammate) => {
          return this.conversationsService.runIfConversationParticipant(
            query.conversationId,
            requestTeammate.id,
            async () =>
              await this.messenger.loadUnReadMessages(
                requestTeammate.id,
                query.conversationId,
              ),
          );
        },
      );
    return unreadMsgHistory.map((msg) => toChatHistoryDto(msg));
  }
}
