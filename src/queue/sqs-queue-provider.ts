import { Logger } from '@nestjs/common';
import {
  DeleteMessageCommand,
  GetQueueUrlCommand,
  ReceiveMessageCommand,
  SendMessageCommand,
  SQSClient,
} from '@aws-sdk/client-sqs';
import { isJobEnvelope, JobEnvelope, QueueName } from '@/queue/job';
import { type QueuedMessage, type QueueProvider } from '@/queue/queue-provider';

export const SQS_REGION = 'eu-west-2';

const SQS_WAIT_TIME_SECONDS = 20;
const SQS_VISIBILITY_TIMEOUT_SECONDS = 30;

export class SqsQueueProvider implements QueueProvider {
  private readonly logger = new Logger(SqsQueueProvider.name);
  private readonly queueUrls = new Map<QueueName, string>();

  constructor(private readonly sqsClient: SQSClient) {}

  async enqueue(queueName: QueueName, body: JobEnvelope): Promise<void> {
    const queueUrl = await this.queueUrl(queueName);
    await this.sqsClient.send(
      new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify(body),
      }),
    );
  }

  async dequeue(queueName: QueueName): Promise<QueuedMessage | null> {
    const queueUrl = await this.queueUrl(queueName);
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

  private async queueUrl(queueName: QueueName): Promise<string> {
    const cachedQueueUrl = this.queueUrls.get(queueName);
    if (cachedQueueUrl) {
      return cachedQueueUrl;
    }

    const getQueueUrlResult = await this.sqsClient.send(
      new GetQueueUrlCommand({ QueueName: queueName }),
    );
    if (!getQueueUrlResult.QueueUrl) {
      throw new Error(`SQS queue URL not found for ${queueName}`);
    }

    this.queueUrls.set(queueName, getQueueUrlResult.QueueUrl);
    return getQueueUrlResult.QueueUrl;
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
    const queueUrl = await this.queueUrl(queueName);
    await this.sqsClient.send(
      new DeleteMessageCommand({
        QueueUrl: queueUrl,
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
