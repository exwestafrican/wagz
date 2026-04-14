import { DecodedResult } from '@/workspace/workspace-invite-service';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export default class DecodedInviteDto {
  @ApiProperty({
    description: 'Email of invited user',
    example: 'teammate1@example.com',
  })
  @IsEmail()
  recipientEmail: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'Code of workspace user was invited to',
    example: 'ap7ol0',
  })
  workspaceCode: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'invite code sent to teammate',
    example: '69a7no',
  })
  inviteCode: string;
}

export function toDecodedInviteDto(decodedResult: DecodedResult) {
  return {
    recipientEmail: decodedResult.recipientEmail,
    workspaceCode: decodedResult.workspaceCode,
    inviteCode: decodedResult.codeInInvite,
  };
}
