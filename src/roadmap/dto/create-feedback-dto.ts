import { IsValidEmail } from '@/common/validators/is-valid-email';
import { IsNotDisposableEmail } from '@/common/validators/is-not-disposable-email.decorator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsUUID,
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateFeedbackDto {
  @ApiProperty({
    description: 'Email of the user leaving the feedback',
    example: 'johndoe@example.com',
  })
  @IsValidEmail()
  public email: string;

  @ApiProperty({
    description: 'Feedback user leaves on a feature',
    example:
      'I would like to be able to see all messages in a chronological order',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(5000, { message: 'Feedback must not exceed 5000 characters' })
  public feedback: string;

  @ApiProperty({
    description: 'Id of the feature receiving feedback',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsUUID(4, { message: 'Invalid feature id' })
  featureId: string;
}
