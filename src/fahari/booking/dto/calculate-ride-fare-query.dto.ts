import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CalculateRideFareQueryDto {
  @ApiProperty({ description: 'Client code', example: 'araiye' })
  @IsString()
  @IsNotEmpty()
  clientCode: string;

  @ApiProperty({
    description: 'When the guest is brought back from the meetup',
    type: String,
    format: 'date-time',
    example: '2026-10-22T10:00:00.000Z',
    required: false,
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  returnDateTime?: Date;
}
