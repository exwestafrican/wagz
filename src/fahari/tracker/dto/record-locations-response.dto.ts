import { ApiProperty } from '@nestjs/swagger';

export class RecordLocationsResponseDto {
  @ApiProperty({ description: 'Number of location points written' })
  count: number;
}
