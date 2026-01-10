import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  Validate,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import SignupDetails from '../domain/signup.details';
import { IsNotDisposableEmail } from '@/common/validators/is-not-disposable-email.decorator';
import { PhoneNumberDto } from '@/auth/dto/phone-number.dto';
import { Type } from 'class-transformer';
import { IsValidPhoneNumberConstraint } from '@/auth/validators/phone-number';

export class SignupEmailDto {
  @ApiProperty({
    description: 'The email address of the user',
    example: 'test@example.com',
  })
  @IsEmail({}, { message: 'Invalid email address' })
  @IsNotEmpty()
  @IsNotDisposableEmail({ message: 'Invalid email address' })
  email: string;

  @ApiProperty({
    description: 'The first name of the user',
    example: 'John',
  })
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({
    description: 'The last name of the user',
    example: 'Doe',
  })
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({
    description: 'The company name of the user',
    example: 'Example Inc.',
  })
  @IsNotEmpty()
  companyName: string;

  @ApiProperty({
    description: 'E.164 version of users phone number',
    example: {
      countryCallingCode: '+234',
      nationalNumber: '8190086655',
    },
    type: PhoneNumberDto, // 👈 For Swagger documentation
    required: false,
  })
  @ValidateIf(
    (o: SignupEmailDto) =>
      o.phoneNumber !== undefined && o.phoneNumber !== null,
  )
  @ValidateNested()
  @Type(() => PhoneNumberDto) // 👈 For runtime transformation
  @Validate(IsValidPhoneNumberConstraint)
  phoneNumber?: PhoneNumberDto;

  static toSignupDetails(signupDto: SignupEmailDto): SignupDetails {
    return new SignupDetails(
      signupDto.email,
      signupDto.firstName,
      signupDto.lastName,
      signupDto.companyName,
    );
  }
}
