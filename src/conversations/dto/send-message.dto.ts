import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({
    description: 'Message content',
    example: 'Hi, I can help with that billing issue.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(65000)
  content: string;
}
