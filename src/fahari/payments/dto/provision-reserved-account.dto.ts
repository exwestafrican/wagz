import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class ProvisionReservedAccountDto {
  @ApiProperty({
    description: 'Driver first name',
    example: 'Ada',
  })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({
    description: 'Driver last name',
    example: 'Okafor',
  })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({
    description: 'Driver email',
    example: 'ada@example.com',
  })
  @Transform(({ value }: { value: string }) => value.trim().toLowerCase())
  @IsEmail({}, { message: 'Invalid email address' })
  @IsNotEmpty()
  email: string;

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
