import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, Matches } from 'class-validator';
import { SESSION_TOKEN_PATTERN } from '@/fahari/booking/dto/address-suggestions-query.dto';

export class PlaceLocationParamsDto {
  @ApiProperty({
    description: 'placeId from an address suggestion',
    example: 'ChIJ5V1jHbH0OxARBdQpXPjXv8Q',
  })
  @Matches(/^[A-Za-z0-9_-]{1,255}$/)
  placeId: string;
}

export class PlaceLocationQueryDto {
  @ApiProperty({
    description: 'The sessionToken used for the suggestions',
    example: '3f1c9c3e-6c55-4c1a-9a43-2b1f0f8e7d21',
    required: false,
  })
  @IsOptional()
  @Matches(SESSION_TOKEN_PATTERN)
  sessionToken?: string;
}
