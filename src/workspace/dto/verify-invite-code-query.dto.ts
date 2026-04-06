import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export default class VerifyInviteCodeQueryDto {
  @ApiProperty({
    description: 'Workspace invite code sent to email',
    example: 'YW5hYmVsYS5zaWRuZWVAZ21haWwuY29tLDlKazA3NixhbmFsOTA',
  })
  @IsString()
  @IsNotEmpty()
  inviteCode: string;
}
