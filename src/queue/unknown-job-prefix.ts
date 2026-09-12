export class UnknownJobPrefix extends Error {
  constructor(jobName: string) {
    super(
      `Job name "${jobName}" must start with a known product prefix (envoye. or fahari.)`,
    );
  }
}
