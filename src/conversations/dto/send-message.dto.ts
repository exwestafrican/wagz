import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class SendTextMessageDto {
  @ApiProperty({ description: 'Workspace code', example: '12er56' })
  @IsString()
  @IsNotEmpty()
  workspaceCode: string;

  @ApiProperty({ description: 'Conversation ID for message', example: 5 })
  @IsInt()
  @IsNotEmpty()
  conversationId: number;

  @ApiProperty({ description: 'Text content', example: 'Hey buddy' })
  @IsString()
  @IsNotEmpty()
  message: string;
}
