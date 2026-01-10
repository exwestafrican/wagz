import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';
import SignupDetails from '../domain/signup.details';
import { IsNotDisposableEmail } from '@/common/validators/is-not-disposable-email.decorator';

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

  static toSignupDetails(signupDto: SignupEmailDto): SignupDetails {
    return new SignupDetails(
      signupDto.email,
      signupDto.firstName,
      signupDto.lastName,
      signupDto.companyName,
    );
  }
}
