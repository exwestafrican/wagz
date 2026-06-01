import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SupabaseAuthGuard } from '@/auth/guard/supabase.guard';
import { User } from '@/auth/decorator/user.decorator';
import RequestUser from '@/auth/domain/request-user';
import { MessagesService } from './messages.service';
import { SendMessageDto } from './dto/send-message.dto';
import {
  MessageResponseDto,
  toMessageResponse,
} from './dto/message-response.dto';

@Controller('conversations')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post(':conversationId/messages')
  @ApiOperation({ summary: 'Send a message in a conversation' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Message sent successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Sender is not a participant of the conversation',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Conversation does not exist',
  })
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(SupabaseAuthGuard)
  async sendMessage(
    @User() requestUser: RequestUser,
    @Param('conversationId', ParseIntPipe) conversationId: number,
    @Body() dto: SendMessageDto,
  ): Promise<MessageResponseDto> {
    const message = await this.messagesService.sendMessage(
      conversationId,
      dto,
      requestUser.email,
    );
    return toMessageResponse(message);
  }
}
