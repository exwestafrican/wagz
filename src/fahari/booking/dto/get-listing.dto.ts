import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export default class GetListingQueryDto {
  @ApiProperty({
    description: 'code of the listing',
    example: 'ARA',
  })
  @IsString()
  @IsNotEmpty()
  code: string;
}
