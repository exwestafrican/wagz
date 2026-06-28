import { ConfigService } from '@nestjs/config';

export const mockAuthService = {
  requestMagicLink: jest.fn(),
  signTeammateUpAndPushMagicLink: jest.fn(),
  signupAutoVerifiedForWorkspace: jest.fn(),
};

export const mockConfigService = {
  get: jest.fn().mockReturnValue('https://app.usewaggz.com'),
} as unknown as ConfigService;
