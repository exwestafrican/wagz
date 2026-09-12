import { Logger } from '@nestjs/common';
import {
  DeleteMessageCommand,
  ReceiveMessageCommand,
  SendMessageCommand,
  SQSClient,
} from '@aws-sdk/client-sqs';
import { isJobEnvelope, JobEnvelope, QueueName } from '@/queue/job';
import { type QueuedMessage, type QueueProvider } from '@/queue/queue-provider';

const SQS_WAIT_TIME_SECONDS = 20;
const SQS_VISIBILITY_TIMEOUT_SECONDS = 30;

export class SqsQueueProvider implements QueueProvider {
  private readonly logger = new Logger(SqsQueueProvider.name);

  constructor(
    private readonly sqsClient: SQSClient,
    private readonly queueUrls: Record<QueueName, string>,
  ) {}

  async enqueue(queueName: QueueName, body: JobEnvelope): Promise<void> {
    await this.sqsClient.send(
      new SendMessageCommand({
        QueueUrl: this.queueUrl(queueName),
        MessageBody: JSON.stringify(body),
      }),
    );
  }

  async dequeue(queueName: QueueName): Promise<QueuedMessage | null> {
    const queueUrl = this.queueUrl(queueName);
    const receiveResult = await this.sqsClient.send(
      new ReceiveMessageCommand({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: 1,
        WaitTimeSeconds: SQS_WAIT_TIME_SECONDS,
        VisibilityTimeout: SQS_VISIBILITY_TIMEOUT_SECONDS,
        MessageSystemAttributeNames: ['ApproximateReceiveCount'],
      }),
    );

    const sqsMessage = receiveResult.Messages?.[0];
    if (!sqsMessage?.ReceiptHandle) {
      return null;
    }

    const jobEnvelope = this.parseEnvelope(sqsMessage.Body);
    if (!jobEnvelope) {
      this.logger.error(
        `Dropping invalid job envelope from ${queueName} queue`,
      );
      await this.deleteMessage(queueName, sqsMessage.ReceiptHandle);
      return null;
    }

    return {
      queueName,
      receipt: sqsMessage.ReceiptHandle,
      body: jobEnvelope,
      receiveCount: parseReceiveCount(
        sqsMessage.Attributes?.ApproximateReceiveCount,
      ),
    };
  }

  async ack(message: QueuedMessage): Promise<void> {
    await this.deleteMessage(message.queueName, message.receipt);
  }

  private queueUrl(queueName: QueueName): string {
    return this.queueUrls[queueName];
  }

  private parseEnvelope(messageBody: string | undefined): JobEnvelope | null {
    if (!messageBody) {
      return null;
    }

    try {
      const parsedBody: unknown = JSON.parse(messageBody);
      return isJobEnvelope(parsedBody) ? parsedBody : null;
    } catch {
      return null;
    }
  }

  private async deleteMessage(
    queueName: QueueName,
    receipt: string,
  ): Promise<void> {
    await this.sqsClient.send(
      new DeleteMessageCommand({
        QueueUrl: this.queueUrl(queueName),
        ReceiptHandle: receipt,
      }),
    );
  }
}

function parseReceiveCount(
  approximateReceiveCount: string | undefined,
): number {
  const receiveCount = Number.parseInt(approximateReceiveCount ?? '1', 10);
  return Number.isFinite(receiveCount) && receiveCount > 0 ? receiveCount : 1;
}
