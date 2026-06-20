import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ListConversationsQueryDto {
  @ApiProperty({ description: 'Workspace code', example: '12er56' })
  @IsString()
  @IsNotEmpty()
  workspaceCode: string;
}
