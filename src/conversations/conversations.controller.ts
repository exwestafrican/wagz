import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SupabaseAuthGuard } from '@/auth/guard/supabase.guard';
import { User } from '@/auth/decorator/user.decorator';
import RequestUser from '@/auth/domain/request-user';
import { ConversationsService } from './conversations.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import {
  ConversationResponseDto,
  toConversationResponse,
} from './dto/conversation-response.dto';

@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new conversation' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Conversation created successfully',
    type: ConversationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User is unauthorized to make this request',
  })
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(SupabaseAuthGuard)
  async createConversation(
    @User() requestUser: RequestUser,
    @Body() dto: CreateConversationDto,
  ): Promise<ConversationResponseDto> {
    const conversation = await this.conversationsService.createConversation(
      dto,
      requestUser.email,
    );
    return toConversationResponse(conversation);
  }
}
