import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class CheckUsernameQueryDto {
  @ApiProperty({
    description: 'Username of teammate to check',
    example: 'laura.smith',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  @Transform(({ value }: { value: string }) => value.toLowerCase())
  username: string;

  @ApiProperty({ description: 'Workspace code', example: '9Jk076' })
  @IsString()
  @IsNotEmpty()
  workspaceCode: string;
}
