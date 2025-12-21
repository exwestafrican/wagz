import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class SignupEmailDto {
  @ApiProperty({
    description: 'The email address of the user',
    example: 'test@example.com',
  })
  @IsEmail({}, { message: 'Invalid email address' })
  @IsNotEmpty()
  email: string;
}
