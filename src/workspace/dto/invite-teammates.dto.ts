import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEmail, ArrayNotEmpty, ArrayMaxSize } from 'class-validator';
const MAX_EMAILS = 10;

export default class InviteTeammatesDto {
  @ApiProperty({
    description: 'List of email addresses to invite (1–10 emails)',
    example: ['teammate1@example.com', 'teammate2@example.com'],
    type: [String],
    minItems: 1,
    maxItems: MAX_EMAILS,
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(MAX_EMAILS, {
    message: `At most ${MAX_EMAILS} emails are allowed per request`,
  })
  @IsEmail({}, { each: true })
  emails: string[];
}
