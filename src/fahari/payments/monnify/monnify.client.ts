import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  MonnifyApiEnvelope,
  MonnifyApiError,
  ReserveAccountRequest,
  ReserveAccountResponseBody,
} from '@/fahari/payments/monnify/monnify.types';

interface CachedAccessToken {
  accessToken: string;
  expiresAtMs: number;
}

@Injectable()
export class MonnifyClient {
  private readonly logger = new Logger(MonnifyClient.name);
  private cachedAccessToken: CachedAccessToken | null = null;

  constructor(private readonly configService: ConfigService) {}

  async reserveAccount(
    request: ReserveAccountRequest,
  ): Promise<ReserveAccountResponseBody> {
    const accessToken = await this.getAccessToken();
    const response = await fetch(
      `${this.baseUrl()}/api/v2/bank-transfer/reserved-accounts`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      },
    );

    const envelope =
      (await response.json()) as MonnifyApiEnvelope<ReserveAccountResponseBody>;

    if (!response.ok || !envelope.requestSuccessful) {
      this.logger.warn(
        `Monnify reserve account failed with responseCode=${envelope.responseCode}`,
      );
      throw new MonnifyApiError(
        'Failed to reserve Monnify account',
        envelope.responseCode,
        envelope.responseMessage,
      );
    }

    return envelope.responseBody;
  }

  async getReservedAccount(
    accountReference: string,
  ): Promise<ReserveAccountResponseBody> {
    const accessToken = await this.getAccessToken();
    const encodedReference = encodeURIComponent(accountReference);
    const response = await fetch(
      `${this.baseUrl()}/api/v2/bank-transfer/reserved-accounts/${encodedReference}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    );

    const envelope =
      (await response.json()) as MonnifyApiEnvelope<ReserveAccountResponseBody>;

    if (!response.ok || !envelope.requestSuccessful) {
      this.logger.warn(
        `Monnify get reserved account failed with responseCode=${envelope.responseCode}`,
      );
      throw new MonnifyApiError(
        'Failed to get Monnify reserved account',
        envelope.responseCode,
        envelope.responseMessage,
      );
    }

    return envelope.responseBody;
  }

  clientSecret(): string {
    return this.configService.getOrThrow<string>('MONNIFY_SECRET_KEY');
  }

  contractCode(): string {
    return this.configService.getOrThrow<string>('MONNIFY_CONTRACT_CODE');
  }

  private baseUrl(): string {
    return this.configService.getOrThrow<string>('MONNIFY_BASE_URL');
  }

  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (
      this.cachedAccessToken &&
      this.cachedAccessToken.expiresAtMs > now + 30_000
    ) {
      return this.cachedAccessToken.accessToken;
    }

    const apiKey = this.configService.getOrThrow<string>('MONNIFY_API_KEY');
    const secretKey = this.clientSecret();
    const basicAuth = Buffer.from(`${apiKey}:${secretKey}`).toString('base64');

    const response = await fetch(`${this.baseUrl()}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
      },
    });

    const envelope = (await response.json()) as MonnifyApiEnvelope<{
      accessToken: string;
      expiresIn: number;
    }>;

    if (!response.ok || !envelope.requestSuccessful) {
      throw new MonnifyApiError(
        'Failed to authenticate with Monnify',
        envelope.responseCode,
        envelope.responseMessage,
      );
    }

    this.cachedAccessToken = {
      accessToken: envelope.responseBody.accessToken,
      expiresAtMs: now + envelope.responseBody.expiresIn * 1000,
    };

    return this.cachedAccessToken.accessToken;
  }
}
