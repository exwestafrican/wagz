import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateConversationDto {
  @ApiProperty({ description: 'Workspace code', example: '12er56' })
  @IsString()
  @IsNotEmpty()
  workspaceCode: string;

  @ApiProperty({ description: 'Teammate ID of the recipient', example: 5 })
  @IsInt()
  @IsNotEmpty()
  recipientTeammateId: number;
}
