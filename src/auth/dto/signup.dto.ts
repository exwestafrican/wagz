import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Validate,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import SignupDetails from '../domain/signup.details';
import { IsNotDisposableEmail } from '@/common/validators/is-not-disposable-email.decorator';
import { PhoneNumberDto } from '@/auth/dto/phone-number.dto';
import { Transform, Type } from 'class-transformer';
import { IsValidPhoneNumberConstraint } from '@/auth/validators/phone-number';
import { IsValidIANATimezoneConstraint } from '../validators/timezone-iana';
import buildUsername from '@/common/build-username';

export class SignupEmailDto {
  @ApiProperty({
    description: 'The email address of the user',
    example: 'test@example.com',
  })
  @Transform(({ value }: { value: string }) => value.trim().toLowerCase())
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
  @Transform(({ value }: { value: string }) =>
    value.trim().replace(/\s+/g, ' '),
  )
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

  @ApiProperty({
    description: 'The timezone of the user',
    example: 'Africa/Lagos',
  })
  @IsNotEmpty()
  @Validate(IsValidIANATimezoneConstraint)
  timezone: string;

  @ApiProperty({
    description: 'Username of teammate',
    example: 'laura.smith',
  })
  @Transform(({ value }: { value: string }) => value.trim().toLowerCase())
  @IsString()
  @IsOptional()
  username?: string;

  static toSignupDetails(signupDto: SignupEmailDto): SignupDetails {
    //TODO: https://github.com/exwestafrican/wagz/issues/286 remove buildusername logic
    const username = signupDto.username
      ? signupDto.username
      : buildUsername(signupDto.firstName, signupDto.lastName);
    return {
      email: signupDto.email,
      firstName: signupDto.firstName,
      lastName: signupDto.lastName,
      username: username,
      companyName: signupDto.companyName,
      timezone: signupDto.timezone,
    };
  }
}
