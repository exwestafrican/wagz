import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export default class AcceptWorkspaceInviteDto {
  @ApiProperty({
    description: 'Workspace code',
    example: '9Jk076',
  })
  @IsString()
  @IsNotEmpty()
  workspaceCode: string;

  @ApiProperty({
    description: 'Invite code stored on the workspace invite record',
    example: 'ap7ol0',
  })
  @IsString()
  @IsNotEmpty()
  inviteCode: string;

  @ApiProperty({
    description: 'Email of teammate accepting the invite',
    example: 'laura@useenvoye.co',
  })
  @IsEmail()
  @IsNotEmpty()
  teammateEmail: string;

  @ApiProperty({
    description: 'First name of teammate',
    example: 'Laura',
  })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({
    description: 'Last name of teammate',
    example: 'Smith',
  })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({
    description: 'Username of teammate',
    example: 'laura.smith',
  })
  @IsString()
  @IsNotEmpty()
  username: string;
}
