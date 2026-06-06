import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
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
import { isSame } from '@/common/utils';
import { Conversation } from '@/generated/prisma/client';

@Controller('conversations')
export class ConversationsController {
  logger = new Logger(ConversationsController.name);

  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly teammatesService: TeammatesService,
    private readonly permissionService: PermissionService,
  ) {}

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
              await this.conversationsService.createSelfConversation(
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
}
