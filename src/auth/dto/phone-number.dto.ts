import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
  Validate,
} from 'class-validator';

export class PhoneNumberDto {
  @ApiProperty({
    description: 'The country code of the user',
    example: '+234',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(4, { message: 'Country code must be less than 3 characters' })
  @MinLength(2, { message: 'Country code must be at least 1 character' })
  @Validate(({ value }: { value: string }) => value.startsWith('+'))
  countryCallingCode: string;

  @ApiProperty({
    description: 'The national number of the user',
    example: '8012345678',
  })
  @IsNotEmpty()
  @IsString()
  nationalNumber: string;
}
