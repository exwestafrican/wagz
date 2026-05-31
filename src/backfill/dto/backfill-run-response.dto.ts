import { IsEnum, IsInt, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum BackfillRunStatus {
  SUCCESS = 'success',
  PARTIAL = 'partial',
  FAILURE = 'failure',
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

  @IsInt()
  @ApiProperty({
    description: 'Number of workspaces the task was attempted against',
    example: 12,
  })
  workspacesProcessed: number;

  @IsInt()
  @ApiProperty({
    description: 'Number of workspaces the task completed successfully on',
    example: 11,
  })
  workspacesSucceeded: number;

  @IsInt()
  @ApiProperty({
    description: 'Number of workspaces the task failed to run on',
    example: 3,
  })
  workspacesFailed: number;
}
