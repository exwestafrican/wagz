import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, Length } from 'class-validator';

export class ProvisionReservedAccountForUserDto {
  @ApiProperty({
    description: 'Id of the user to provision a reserved account for',
    example: 12,
  })
  @Type(() => Number)
  @IsInt()
  userId: number;

  @ApiProperty({
    description: 'Driver BVN (11 digits)',
    example: '21212121212',
  })
  @IsString()
  @IsNotEmpty()
  @Length(11, 11)
  bvn: string;

  @ApiProperty({
    description: 'Driver NIN (11 digits)',
    example: '12034875601',
  })
  @IsString()
  @IsNotEmpty()
  @Length(11, 11)
  nin: string;
}
