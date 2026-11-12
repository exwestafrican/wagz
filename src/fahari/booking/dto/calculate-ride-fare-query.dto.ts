import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsNotEmpty, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CalculateRideFareQueryDto {
  @ApiProperty({ description: 'Client code', example: 'araiye' })
  @IsString()
  @IsNotEmpty()
  clientCode: string;

  @ApiProperty({
    description: 'When to pick the guest up',
    type: String,
    format: 'date-time',
    example: '2026-10-21T14:00:00.000Z',
  })
  @Type(() => Date)
  @IsDate()
  @IsNotEmpty()
  pickupDateTime: Date;

  @ApiProperty({
    description: 'When the guest is brought back from the meetup',
    type: String,
    format: 'date-time',
    example: '2026-10-22T10:00:00.000Z',
  })
  @Type(() => Date)
  @IsDate()
  @IsNotEmpty()
  returnDateTime: Date;
}
