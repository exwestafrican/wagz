import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, Length } from 'class-validator';

export class ProvisionReservedAccountDto {
  @ApiProperty({
    description: 'Fahari user id of the driver',
    example: 42,
  })
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
