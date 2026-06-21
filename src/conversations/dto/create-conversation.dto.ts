import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsString,
} from 'class-validator';
import MaxCharacterLimit from '@/common/validators/max-character-limit';
import { MAX_ENVOYE_MESSAGE_CHARACTERS } from '@/conversations/const';

export class CreateConversationDto {
  @ApiProperty({ description: 'Workspace code', example: '12er56' })
  @IsString()
  @IsNotEmpty()
  workspaceCode: string;

  @ApiProperty({ description: 'Teammate ID of the recipient', example: 5 })
  @IsInt()
  @IsNotEmpty()
  recipientTeammateId: number;

  @ApiProperty({
    description:
      'Messages to send when the conversation is created (max 2000 characters total)',
    example: ['Hey buddy', 'Hi'],
    type: [String],
    minItems: 1,
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxCharacterLimit(MAX_ENVOYE_MESSAGE_CHARACTERS)
  openingMessage: string[];
}
