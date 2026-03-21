import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEmail, ArrayNotEmpty, ArrayMaxSize } from 'class-validator';
import { ROLES } from '@/permission/types';
const MAX_EMAILS = 10;
const INVITEABLE_ROLES = Object.keys(ROLES);

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

  @ApiProperty({
    description: 'Role to assign to all invited teammates',
    enum: INVITEABLE_ROLES,
    example: 'SupportStaff',
  })
  role: string;

  @ApiProperty({
    description: 'Workspace code of company',
    example: 'ex45po',
  })
  workspaceCode: string;
}
