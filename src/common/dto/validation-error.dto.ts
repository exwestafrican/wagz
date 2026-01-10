import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export default class ValidationErrorResponseDto {
  @ApiProperty({ description: 'status code of response', example: 400 })
  statusCode: number;

  @ApiProperty({ example: 'Bad Request' })
  @IsString()
  error: string;

  @ApiProperty({
    type: [String],
    example: ['Invalid email address', 'email must be an email'],
  })
  message: string[];

  @ApiProperty({
    type: [String],
    example: ['email'],
  })
  property: string[];
}
