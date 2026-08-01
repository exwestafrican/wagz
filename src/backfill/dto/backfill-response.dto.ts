import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TaskDetails } from '@/backfill/task';

export default class BackfillResponseDto {
  @IsString()
  @ApiProperty({
    description: 'Job Id',
    example: 'normalize_usernames',
  })
  jobId: string;

  @IsString()
  @ApiProperty({
    description: 'Job name',
    example: 'Backfill Normalised usernames',
  })
  name: string;

  @IsString()
  @ApiProperty({
    description: 'Description of job',
    example:
      'Removes special characters from username and stores in normalized format',
  })
  description: string;
}

export function toBackfillResponseDto(detail: TaskDetails) {
  return {
    jobId: detail.id,
    name: detail.name,
    description: detail.description,
  };
}
