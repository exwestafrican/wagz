import { IsNotDisposableEmail } from '@/common/validators/is-not-disposable-email.decorator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty } from 'class-validator';

export default class GetUserVotesDto {
  @ApiProperty({
    description: 'Email of the user to get votes for',
    example: 'user@example.com',
  })
  @IsNotEmpty()
  @Transform(({ value }: { value: string }) => value.trim().toLowerCase())
  @IsEmail({}, { message: 'Invalid email address' })
  @IsNotDisposableEmail({ message: 'Invalid email address' })
  email: string;
}

