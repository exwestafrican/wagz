import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsString, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import type { JobRunSummary } from '@/backfill/utils';
import { BackfillRunStatus } from '@/backfill/backfill-run-status';

export { BackfillRunStatus };

export class BackfillRunResultDto {
  @IsInt()
  @ApiProperty({
    description: 'Number of workspaces the task was attempted against',
    example: 12,
  })
  processed: number;

  @IsInt()
  @ApiProperty({
    description: 'Number of workspaces the task completed successfully on',
    example: 11,
  })
  success: number;

  @IsInt()
  @ApiProperty({
    description: 'Number of workspaces the task failed to run on',
    example: 1,
  })
  failed: number;
}

export default class BackfillRunResponseDto {
  @IsString()
  @ApiProperty({
    description: 'Job Id that was run',
    example: 'normalize_usernames',
  })
  jobId: string;

  @IsEnum(BackfillRunStatus)
  @ApiProperty({
    description:
      'Overall outcome: success (all workspaces ran), partial (some failed), failure (all failed)',
    enum: BackfillRunStatus,
    example: BackfillRunStatus.SUCCESS,
  })
  status: BackfillRunStatus;

  @ValidateNested()
  @Type(() => BackfillRunResultDto)
  @ApiProperty({
    description: 'Per-workspace run counts',
    type: BackfillRunResultDto,
  })
  result: BackfillRunResultDto;
}

export function toBackfillRunResponseDto(
  summary: JobRunSummary,
): BackfillRunResponseDto {
  return {
    jobId: summary.jobId,
    status: summary.status,
    result: {
      success: summary.success,
      failed: summary.failed,
      processed: summary.processed,
    },
  };
}
