import { JobRouter } from '@/queue/job-router';
import { UnknownJobPrefix } from '@/queue/unknown-job-prefix';

describe('JobRouter', () => {
  const jobRouter = new JobRouter();

  it('routes envoye-prefixed jobs to the envoye queue', () => {
    expect(jobRouter.route('envoye.send-invite')).toBe('envoye');
  });

  it('routes fahari-prefixed jobs to the fahari queue', () => {
    expect(jobRouter.route('fahari.geofence-alert')).toBe('fahari');
  });

  it('uses an override when a job is pinned to a queue', () => {
    const jobRouterWithOverride = new JobRouter({
      'envoye.hot-job': 'fahari',
    });
    expect(jobRouterWithOverride.route('envoye.hot-job')).toBe('fahari');
  });

  it.each(['send-invite', 'envoye', 'envoye.', '.send-invite', 'other.job'])(
    'rejects job name %s',
    (jobName) => {
      expect(() => jobRouter.route(jobName)).toThrow(UnknownJobPrefix);
    },
  );
});
