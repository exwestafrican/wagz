import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class UnreadMessageQueryDto {
  @ApiProperty({ description: 'Workspace code', example: '12er56' })
  @IsString()
  @IsNotEmpty()
  workspaceCode: string;

  @ApiProperty({ description: 'Conversation ID', example: 123 })
  @IsNumber()
  conversationId: number;
}
