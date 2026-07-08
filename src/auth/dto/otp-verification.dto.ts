import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class OtpVerificationDto {
  @ApiProperty({
    description: 'The email address of the user',
    example: 'test@example.com',
  })
  @IsEmail({}, { message: 'Invalid email address' })
  @IsNotEmpty()
  readonly email: string;

  @ApiProperty({
    description: 'The OTP code sent to the user',
    example: '123456',
  })
  @IsNotEmpty()
  readonly otp: string;
}
