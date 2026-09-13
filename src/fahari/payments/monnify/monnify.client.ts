import { Logger } from '@nestjs/common';
import {
  MonnifyApiEnvelope,
  MonnifyApiError,
  ReserveAccountRequest,
  ReserveAccountResponseBody,
} from '@/fahari/payments/monnify/monnify.types';

export class MonnifyClient {
  private readonly logger = new Logger(MonnifyClient.name);

  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
    readonly secretKey: string,
    readonly contractCode: string,
  ) {}

  async reserveAccount(
    request: ReserveAccountRequest,
  ): Promise<ReserveAccountResponseBody> {
    const accessToken = await this.getAccessToken();
    const response = await fetch(
      `${this.baseUrl}/api/v2/bank-transfer/reserved-accounts`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      },
    );

    return this.runIfOk(
      response,
      'Failed to reserve Monnify account',
      (envelope) =>
        (envelope as MonnifyApiEnvelope<ReserveAccountResponseBody>)
          .responseBody,
    );
  }

  async getReservedAccount(
    accountReference: string,
  ): Promise<ReserveAccountResponseBody> {
    const accessToken = await this.getAccessToken();
    const encodedReference = encodeURIComponent(accountReference);
    const response = await fetch(
      `${this.baseUrl}/api/v2/bank-transfer/reserved-accounts/${encodedReference}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    );

    return this.runIfOk(
      response,
      'Failed to get Monnify reserved account',
      (envelope) =>
        (envelope as MonnifyApiEnvelope<ReserveAccountResponseBody>)
          .responseBody,
    );
  }

  // TODO: install a cache (e.g. cache-manager / @nestjs/cache-manager) and
  // cache the Monnify access token until near expiresIn instead of logging in
  // on every request.
  private async getAccessToken(): Promise<string> {
    const basicAuth = Buffer.from(`${this.apiKey}:${this.secretKey}`).toString(
      'base64',
    );

    const response = await fetch(`${this.baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
      },
    });

    return this.runIfOk(
      response,
      'Failed to authenticate with Monnify',
      (envelope) =>
        (
          envelope as MonnifyApiEnvelope<{
            accessToken: string;
            expiresIn: number;
          }>
        ).responseBody.accessToken,
    );
  }

  private async runIfOk<T>(
    response: Response,
    failureMessage: string,
    mapBody: (envelope: MonnifyApiEnvelope<unknown>) => T,
  ): Promise<T> {
    const envelope = (await response.json()) as MonnifyApiEnvelope<unknown>;
    if (!response.ok || !envelope.requestSuccessful) {
      this.logger.warn(
        `${failureMessage} responseCode=${envelope.responseCode}`,
      );
      throw new MonnifyApiError(
        failureMessage,
        envelope.responseCode,
        envelope.responseMessage,
      );
    }
    return mapBody(envelope);
  }
}
