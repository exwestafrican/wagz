import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import {
  IsValidUsername,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  USERNAME_REGEX,
} from '@/common/validators/is-valid-username';

export class CheckUsernameQueryDto {
  @ApiProperty({
    description: 'Username of teammate to check',
    example: 'laura.smith',
    minLength: USERNAME_MIN_LENGTH,
    maxLength: USERNAME_MAX_LENGTH,
    pattern: USERNAME_REGEX,
  })
  @IsValidUsername()
  username: string;

  @ApiProperty({ description: 'Workspace code', example: '9Jk076' })
  @IsString()
  @IsNotEmpty()
  workspaceCode: string;
}
