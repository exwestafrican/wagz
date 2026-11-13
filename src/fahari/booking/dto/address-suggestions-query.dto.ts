import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export const SESSION_TOKEN_PATTERN = /^[A-Za-z0-9_-]{1,36}$/;

export class AddressSuggestionsQueryDto {
  @ApiProperty({
    description: 'What the guest has typed so far',
    example: 'Admiralty Way',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  input: string;

  @ApiProperty({
    description:
      'Same value for every search and the final pick of one address, so Google bills them as one session',
    example: '3f1c9c3e-6c55-4c1a-9a43-2b1f0f8e7d21',
    required: false,
  })
  @IsOptional()
  @Matches(SESSION_TOKEN_PATTERN)
  sessionToken?: string;
}
