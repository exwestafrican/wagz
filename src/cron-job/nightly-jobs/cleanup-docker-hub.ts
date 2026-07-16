import CronJob from '@/cron-job/job';

export class CleanupDockerHub implements CronJob {
  readonly name: string;
  run(): void {
    // Login to docker
    // Get token
    // get list of  sort_by(.last_updated)
    // skip special tags
    // delete after 5th
  }

}