import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsNotEmpty, IsString, Min } from 'class-validator';
import {
  LINE_ITEMS,
  type LineItem,
} from '@/fahari/booking/calculator/resort-line-item-pricer';

export class CalculateBillingQueryDto {
  @ApiProperty({ description: 'Resort experience code', example: 'araiye' })
  @IsString()
  @IsNotEmpty()
  resortCode: string;

  @ApiProperty({ description: 'Number of nights to bill', example: 2 })
  @IsInt()
  @Min(0)
  numberOfNights: number;

  @ApiProperty({
    description: 'Billing line item',
    enum: LINE_ITEMS,
    example: 'accommodation',
  })
  @IsString()
  @IsIn(LINE_ITEMS)
  lineItem: LineItem;

  @ApiProperty({ description: 'Number of guests', example: 2 })
  @IsInt()
  @Min(1)
  numberOfGuests: number;
}
