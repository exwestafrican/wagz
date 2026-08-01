import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsDate,
  IsInt,
  IsNotEmpty,
  IsString,
  MaxDate,
} from 'class-validator';
import MaxCharacterLimit from '@/common/validators/max-character-limit';
import { MAX_ENVOYE_MESSAGE_CHARACTERS } from '@/conversations/const';

export class CreateConversationDto {
  @ApiProperty({ description: 'Workspace code', example: '12er56' })
  @IsString()
  @IsNotEmpty()
  workspaceCode: string;

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

  @ApiProperty({
    description: 'Ids of recipient teammates',
    example: [1, 5],
    minItems: 1,
    type: [Number],
  })
  @ArrayNotEmpty()
  @Type(() => Number)
  @IsInt({ each: true })
  recipientTeammateIds: number[];

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-06-24T12:00:00.000Z',
  })
  @Type(() => Date)
  @IsDate()
  @IsNotEmpty()
  @MaxDate(() => new Date(), { message: 'sentAt cannot be in the future' })
  sentAt: Date;
}
