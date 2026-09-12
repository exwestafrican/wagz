import {
  DeleteMessageCommand,
  ReceiveMessageCommand,
  SendMessageCommand,
  SQSClient,
} from '@aws-sdk/client-sqs';
import { JobEnvelope } from '@/queue/job';
import { SqsQueueProvider } from '@/queue/sqs-queue-provider';

const ENVOYE_QUEUE_URL = 'https://sqs.eu-west-2.amazonaws.com/123/envoye';
const FAHARI_QUEUE_URL = 'https://sqs.eu-west-2.amazonaws.com/123/fahari';

type SqsCommand =
  | SendMessageCommand
  | ReceiveMessageCommand
  | DeleteMessageCommand;

function inviteEnvelope(): JobEnvelope {
  return {
    id: 'job-1',
    name: 'envoye.send-invite',
    payload: { workspaceId: 'workspace-kobo' },
    enqueuedAt: '2026-09-12T12:00:00.000Z',
  };
}

describe('SqsQueueProvider', () => {
  const send = jest.fn();
  const queueProvider = new SqsQueueProvider({ send } as unknown as SQSClient, {
    envoye: ENVOYE_QUEUE_URL,
    fahari: FAHARI_QUEUE_URL,
  });

  beforeEach(() => {
    send.mockReset();
  });

  function sentCommandAt(callIndex: number): SqsCommand {
    const sentCommands = send.mock.calls as Array<[SqsCommand]>;
    const command = sentCommands[callIndex]?.[0];
    if (!command) {
      throw new Error(`Expected SQS command at call ${callIndex}`);
    }
    return command;
  }

  it('sends the job envelope to the product queue URL', async () => {
    send.mockResolvedValueOnce({});
    const jobEnvelope = inviteEnvelope();

    await queueProvider.enqueue('envoye', jobEnvelope);

    expect(send).toHaveBeenCalledTimes(1);
    const sendCommand = sentCommandAt(0);
    expect(sendCommand).toBeInstanceOf(SendMessageCommand);
    if (!(sendCommand instanceof SendMessageCommand)) {
      throw new Error('expected SendMessageCommand');
    }
    expect(sendCommand.input).toEqual({
      QueueUrl: ENVOYE_QUEUE_URL,
      MessageBody: JSON.stringify(jobEnvelope),
    });
  });

  it('returns a queued message from a receive', async () => {
    const jobEnvelope = inviteEnvelope();
    send.mockResolvedValueOnce({
      Messages: [
        {
          Body: JSON.stringify(jobEnvelope),
          ReceiptHandle: 'receipt-1',
          Attributes: { ApproximateReceiveCount: '2' },
        },
      ],
    });

    const queuedMessage = await queueProvider.dequeue('envoye');

    expect(queuedMessage).toEqual({
      queueName: 'envoye',
      receipt: 'receipt-1',
      body: jobEnvelope,
      receiveCount: 2,
    });
    const receiveCommand = sentCommandAt(0);
    expect(receiveCommand).toBeInstanceOf(ReceiveMessageCommand);
    if (!(receiveCommand instanceof ReceiveMessageCommand)) {
      throw new Error('expected ReceiveMessageCommand');
    }
    expect(receiveCommand.input.QueueUrl).toBe(ENVOYE_QUEUE_URL);
    expect(receiveCommand.input.WaitTimeSeconds).toBe(20);
    expect(receiveCommand.input.VisibilityTimeout).toBe(30);
  });

  it('returns null when SQS has no messages', async () => {
    send.mockResolvedValueOnce({ Messages: [] });

    expect(await queueProvider.dequeue('fahari')).toBeNull();
  });

  it('deletes an invalid envelope so it is not retried', async () => {
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

    expect(await queueProvider.dequeue('envoye')).toBeNull();

    const deleteCommand = sentCommandAt(1);
    expect(deleteCommand).toBeInstanceOf(DeleteMessageCommand);
    if (!(deleteCommand instanceof DeleteMessageCommand)) {
      throw new Error('expected DeleteMessageCommand');
    }
    expect(deleteCommand.input).toEqual({
      QueueUrl: ENVOYE_QUEUE_URL,
      ReceiptHandle: 'poison-receipt',
    });
  });

  it('acks by deleting the SQS message', async () => {
    send.mockResolvedValueOnce({});

    await queueProvider.ack({
      queueName: 'fahari',
      receipt: 'receipt-fahari',
      body: {
        id: 'job-2',
        name: 'fahari.geofence-alert',
        payload: {},
        enqueuedAt: '2026-09-12T12:00:00.000Z',
      },
      receiveCount: 1,
    });

    const deleteCommand = sentCommandAt(0);
    expect(deleteCommand).toBeInstanceOf(DeleteMessageCommand);
    if (!(deleteCommand instanceof DeleteMessageCommand)) {
      throw new Error('expected DeleteMessageCommand');
    }
    expect(deleteCommand.input).toEqual({
      QueueUrl: FAHARI_QUEUE_URL,
      ReceiptHandle: 'receipt-fahari',
    });
  });
});
