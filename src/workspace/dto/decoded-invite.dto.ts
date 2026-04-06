import { DecodedResult } from '@/workspace/workspace-invite-service';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export default class DecodedInviteDto {
  @ApiProperty({
    description: 'Email of invited user',
    example: 'teammate1@example.com',
  })
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'Code of workspace user was invited tr',
    example: 'ap7ol0',
  })
  workspaceCode: string;
}

export function toDecodedInviteDto(decodedResult: DecodedResult) {
  return {
    email: decodedResult.email,
    workspaceCode: decodedResult.workspaceCode,
  };
}
