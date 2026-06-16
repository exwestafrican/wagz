import { Logger } from '@nestjs/common';

export default function setupNightlyJobs() {
  const logger = new Logger('NightlyJobs');
  logger.log('Starting nightly cron jobs...');
}


function nightlyJobsRegistry() {
    return [

    ]
}
