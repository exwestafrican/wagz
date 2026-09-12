export const QUEUE_NAMES = ['envoye', 'fahari'] as const;

export type QueueName = (typeof QUEUE_NAMES)[number];

export type JobEnvelope = {
  id: string;
  name: string;
  payload: unknown;
  enqueuedAt: string;
};

export function isQueueName(value: string): value is QueueName {
  return (QUEUE_NAMES as readonly string[]).includes(value);
}

export function isJobEnvelope(value: unknown): value is JobEnvelope {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const jobEnvelope = value as Partial<JobEnvelope>;
  return (
    typeof jobEnvelope.id === 'string' &&
    typeof jobEnvelope.name === 'string' &&
    typeof jobEnvelope.enqueuedAt === 'string' &&
    'payload' in jobEnvelope
  );
}
