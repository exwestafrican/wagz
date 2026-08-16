import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export default class InviteTeammatesQueryDto {
  @ApiProperty({
    description: 'Workspace code of company',
    example: 'ex45po',
  })
  @IsString()
  @IsNotEmpty()
  workspaceCode: string;
}
