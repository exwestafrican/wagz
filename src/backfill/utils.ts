import { Workspace } from '@/generated/prisma/client';
import { BackfillRunStatus } from '@/backfill/backfill-run-status';

export type JobRunSummary = {
  jobId: string;
  success: number;
  failed: number;
  processed: number;
  status: BackfillRunStatus;
};

export default function buildJobRunSummary(
  jobId: string,
  workspaces: Workspace[],
  failed: number,
): JobRunSummary {
  const processed = workspaces.length;
  const success = processed - failed;

  let status: BackfillRunStatus;

  if (failed === 0) {
    status = BackfillRunStatus.SUCCESS;
  } else if (failed === processed) {
    status = BackfillRunStatus.FAILURE;
  } else {
    status = BackfillRunStatus.PARTIAL;
  }

  return {
    jobId,
    success,
    failed,
    processed,
    status,
  };
}
