import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class ProvisionReservedAccountDto {
  @ApiPropertyOptional({
    description: 'Driver BVN (11 digits). Required if nin is omitted.',
    example: '21212121212',
  })
  @IsOptional()
  @IsString()
  @Length(11, 11)
  bvn?: string;

  @ApiPropertyOptional({
    description: 'Driver NIN (11 digits). Required if bvn is omitted.',
    example: '12034875601',
  })
  @IsOptional()
  @IsString()
  @Length(11, 11)
  nin?: string;
}
