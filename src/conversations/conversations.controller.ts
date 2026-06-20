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
import { notInDbError } from '@/common/error-type';
import { isSame } from '@/common/utils';
import { Conversation } from '@/generated/prisma/client';
import EnvoyeMessenger from '@/conversations/messangers/envoye';
import { SendTextMessageDto } from '@/conversations/dto/send-message.dto';
import { ListConversationsQueryDto } from '@/conversations/dto/list-conversations-query.dto';
import { ConversationMetadataResponseDto } from '@/conversations/dto/conversation-metadata-response.dto';

@Controller('conversations')
export class ConversationsController {
  logger = new Logger(ConversationsController.name);

  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly teammatesService: TeammatesService,
    private readonly permissionService: PermissionService,
    private readonly messanger: EnvoyeMessenger,
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
        this.messanger.conversations(query.workspaceCode, teammate.id),
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
          const sender = senderTeammate.id;
          const recipient = dto.recipientTeammateId;
          let conversation: Conversation;

          if (isSame(sender, recipient)) {
            conversation =
              await this.conversationsService.createDirectMessageWithSelf(
                dto.workspaceCode,
                senderTeammate.id,
              );
          } else {
            conversation =
              await this.teammatesService.runIfTeammatesInSameWorkspace(
                senderTeammate.id,
                [dto.recipientTeammateId],
                (senderId, [recipientId], workspaceCode) =>
                  this.conversationsService.createDirectMessage(
                    senderId,
                    recipientId,
                    workspaceCode,
                  ),
              );
          }

          return toConversationResponse(conversation);
        } catch (error) {
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
        try {
          await this.conversationsService.runIfConversationParticipant(
            dto.conversationId,
            senderTeammate.id,
            () =>
              this.messanger.sendTextMessage(
                dto.conversationId,
                senderTeammate.id,
                dto.message,
              ),
          );
        } catch (error) {
          if (notInDbError(error)) {
            throw new NotFoundException();
          }
          throw error;
        }
      },
    );
  }
}
