import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ConversationType } from '@/conversations/const';

export class ListConversationsQueryDto {
  @ApiProperty({ description: 'Workspace code', example: '12er56' })
  @IsString()
  @IsNotEmpty()
  workspaceCode: string;

  @ApiPropertyOptional({
    description: 'Filter by conversation type',
    enum: Object.values(ConversationType),
    default: ConversationType.ALL,
  })
  @IsOptional()
  @IsString()
  @IsIn(Object.values(ConversationType))
  conversationType?: string = ConversationType.ALL;
}
