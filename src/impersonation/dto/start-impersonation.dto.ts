import { IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class StartImpersonationDto {
  @IsNumber()
  @ApiProperty({
    description: 'Id of the teammate to impersonate',
    example: 42,
  })
  teammateId: number;
}
