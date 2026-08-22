import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { FeatureRequestPriority } from '@/generated/prisma/enums';
import { IsNotDisposableEmail } from '@/common/validators/is-not-disposable-email.decorator';

export class CreateFeatureRequestDto {
  @ApiProperty({
    description: 'Email of the user requesting the feature',
    example: 'user@example.com',
  })
  @IsNotEmpty()
  @Transform(({ value }: { value: string }) => value.trim().toLowerCase())
  @IsEmail({}, { message: 'Invalid email address' })
  @IsNotDisposableEmail({ message: 'Invalid email address' })
  public email: string;

  @ApiProperty({
    description: 'Description of the feature request',
    example: 'Add support for dark mode',
    maxLength: 5000,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(5000, { message: 'Description must not exceed 5000 characters' })
  public description: string;

  @ApiProperty({
    description: 'Priority of the feature request',
    enum: FeatureRequestPriority,
    example: FeatureRequestPriority.MEDIUM,
    required: false,
  })
  @IsEnum(FeatureRequestPriority)
  public priority: FeatureRequestPriority;
}
