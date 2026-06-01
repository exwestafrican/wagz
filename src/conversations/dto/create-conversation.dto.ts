import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateConversationDto {
  @ApiProperty({ description: 'Workspace code', example: '12er56' })
  @IsString()
  @IsNotEmpty()
  workspaceCode: string;

  @ApiProperty({ description: 'Customer info', example: 'john@acme.com' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  customerInfo: string;

  @ApiProperty({ description: 'Subject', example: 'Billing issue', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  subject?: string;

  @ApiProperty({ description: 'Teammate ID of the recipient', example: 5 })
  @IsInt()
  @IsNotEmpty()
  recipientTeammateId: number;
}
