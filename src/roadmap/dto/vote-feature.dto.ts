import { IsNotDisposableEmail } from '@/common/validators/is-not-disposable-email.decorator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsUUID } from 'class-validator';

export default class VoteFeatureDto {
  @ApiProperty({
    description: 'Email of the user voting for the feature',
    example: 'user@example.com',
  })
  @IsNotEmpty()
  @IsEmail({}, { message: 'Invalid email address' })
  @Transform(({ value }: { value: string }) => value.trim().toLowerCase())
  @IsNotDisposableEmail({ message: 'Invalid email address' })
  email: string;

  @ApiProperty({
    description: 'Id of the feature to vote for',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsUUID(4, { message: 'Invalid feature id' })
  featureId: string;
}
