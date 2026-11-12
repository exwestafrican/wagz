import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GetChauffeurClientQueryDto {
  @ApiProperty({
    description: 'Code of the chauffeur client',
    example: 'araiye',
  })
  @IsString()
  @IsNotEmpty()
  code: string;
}
