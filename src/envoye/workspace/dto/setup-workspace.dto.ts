import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export default class SetupWorkspaceDto {
  @ApiProperty({
    description: 'PreVerification id',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsUUID(4, { message: 'Invalid id' })
  id: string;
}
