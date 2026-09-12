import {
  DeleteMessageCommand,
  GetQueueUrlCommand,
  ReceiveMessageCommand,
  SendMessageCommand,
  SQSClient,
} from '@aws-sdk/client-sqs';
import { JobEnvelope } from '@/queue/job';
import { SqsQueueProvider } from '@/queue/sqs-queue-provider';

const EMAIL_NOTIFICATION_QUEUE_URL =
  'https://sqs.eu-west-2.amazonaws.com/123/email-notification';
const PROCESS_TRANSACTION_QUEUE_URL =
  'https://sqs.eu-west-2.amazonaws.com/123/process-transaction';

type SqsCommand =
  | GetQueueUrlCommand
  | SendMessageCommand
  | ReceiveMessageCommand
  | DeleteMessageCommand;

function notificationEnvelope(): JobEnvelope {
  return {
    id: 'job-1',
    name: 'email-notification',
    payload: { workspaceId: 'workspace-kobo' },
    enqueuedAt: '2026-09-12T12:00:00.000Z',
  };
}

describe('SqsQueueProvider', () => {
  const send = jest.fn();
  let queueProvider: SqsQueueProvider;

  beforeEach(() => {
    send.mockReset();
    queueProvider = new SqsQueueProvider({ send } as unknown as SQSClient);
  });

  function sentCommandAt(callIndex: number): SqsCommand {
    const sentCommands = send.mock.calls as Array<[SqsCommand]>;
    const command = sentCommands[callIndex]?.[0];
    if (!command) {
      throw new Error(`Expected SQS command at call ${callIndex}`);
    }
    return command;
  }

  function mockQueueUrl(
    queueUrl: string,
  ): ReturnType<typeof send.mockResolvedValueOnce> {
    return send.mockResolvedValueOnce({ QueueUrl: queueUrl });
  }

  it('resolves the queue URL then sends the job envelope', async () => {
    mockQueueUrl(EMAIL_NOTIFICATION_QUEUE_URL);
    send.mockResolvedValueOnce({});
    const jobEnvelope = notificationEnvelope();

    await queueProvider.enqueue('email-notification', jobEnvelope);

    expect(send).toHaveBeenCalledTimes(2);
    const getQueueUrlCommand = sentCommandAt(0);
    expect(getQueueUrlCommand).toBeInstanceOf(GetQueueUrlCommand);
    if (!(getQueueUrlCommand instanceof GetQueueUrlCommand)) {
      throw new Error('expected GetQueueUrlCommand');
    }
    expect(getQueueUrlCommand.input).toEqual({
      QueueName: 'email-notification',
    });

    const sendCommand = sentCommandAt(1);
    expect(sendCommand).toBeInstanceOf(SendMessageCommand);
    if (!(sendCommand instanceof SendMessageCommand)) {
      throw new Error('expected SendMessageCommand');
    }
    expect(sendCommand.input).toEqual({
      QueueUrl: EMAIL_NOTIFICATION_QUEUE_URL,
      MessageBody: JSON.stringify(jobEnvelope),
    });
  });

  it('caches the queue URL across calls', async () => {
    mockQueueUrl(EMAIL_NOTIFICATION_QUEUE_URL);
    send.mockResolvedValueOnce({});
    send.mockResolvedValueOnce({});
    const jobEnvelope = notificationEnvelope();

    await queueProvider.enqueue('email-notification', jobEnvelope);
    await queueProvider.enqueue('email-notification', jobEnvelope);

    const sentCommands = send.mock.calls as Array<[SqsCommand]>;
    const getQueueUrlCalls = sentCommands.filter(
      ([command]) => command instanceof GetQueueUrlCommand,
    );
    expect(getQueueUrlCalls).toHaveLength(1);
  });

  it('returns a queued message from a receive', async () => {
    const jobEnvelope = notificationEnvelope();
    mockQueueUrl(EMAIL_NOTIFICATION_QUEUE_URL);
    send.mockResolvedValueOnce({
      Messages: [
        {
          Body: JSON.stringify(jobEnvelope),
          ReceiptHandle: 'receipt-1',
          Attributes: { ApproximateReceiveCount: '2' },
        },
      ],
    });

    const queuedMessage = await queueProvider.dequeue('email-notification');

    expect(queuedMessage).toEqual({
      queueName: 'email-notification',
      receipt: 'receipt-1',
      body: jobEnvelope,
      receiveCount: 2,
    });
    const receiveCommand = sentCommandAt(1);
    expect(receiveCommand).toBeInstanceOf(ReceiveMessageCommand);
    if (!(receiveCommand instanceof ReceiveMessageCommand)) {
      throw new Error('expected ReceiveMessageCommand');
    }
    expect(receiveCommand.input.QueueUrl).toBe(EMAIL_NOTIFICATION_QUEUE_URL);
    expect(receiveCommand.input.WaitTimeSeconds).toBe(20);
    expect(receiveCommand.input.VisibilityTimeout).toBe(30);
  });

  it('returns null when SQS has no messages', async () => {
    mockQueueUrl(PROCESS_TRANSACTION_QUEUE_URL);
    send.mockResolvedValueOnce({ Messages: [] });

    expect(await queueProvider.dequeue('process-transaction')).toBeNull();
  });

  it('deletes an invalid envelope so it is not retried', async () => {
    mockQueueUrl(EMAIL_NOTIFICATION_QUEUE_URL);
    send
      .mockResolvedValueOnce({
        Messages: [
          {
            Body: '{not-json',
            ReceiptHandle: 'poison-receipt',
          },
        ],
      })
      .mockResolvedValueOnce({});

    expect(await queueProvider.dequeue('email-notification')).toBeNull();

    const deleteCommand = sentCommandAt(2);
    expect(deleteCommand).toBeInstanceOf(DeleteMessageCommand);
    if (!(deleteCommand instanceof DeleteMessageCommand)) {
      throw new Error('expected DeleteMessageCommand');
    }
    expect(deleteCommand.input).toEqual({
      QueueUrl: EMAIL_NOTIFICATION_QUEUE_URL,
      ReceiptHandle: 'poison-receipt',
    });
  });

  it('acks by deleting the SQS message', async () => {
    mockQueueUrl(PROCESS_TRANSACTION_QUEUE_URL);
    send.mockResolvedValueOnce({});

    await queueProvider.ack({
      queueName: 'process-transaction',
      receipt: 'receipt-txn',
      body: {
        id: 'job-2',
        name: 'process-transaction',
        payload: {},
        enqueuedAt: '2026-09-12T12:00:00.000Z',
      },
      receiveCount: 1,
    });

    const deleteCommand = sentCommandAt(1);
    expect(deleteCommand).toBeInstanceOf(DeleteMessageCommand);
    if (!(deleteCommand instanceof DeleteMessageCommand)) {
      throw new Error('expected DeleteMessageCommand');
    }
    expect(deleteCommand.input).toEqual({
      QueueUrl: PROCESS_TRANSACTION_QUEUE_URL,
      ReceiptHandle: 'receipt-txn',
    });
  });
});
