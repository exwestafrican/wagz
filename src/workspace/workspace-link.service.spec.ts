import { ConfigService } from '@nestjs/config';
import { WorkspaceLinkService } from '@/workspace/workspace-link.service';

describe('WorkspaceLinkService', () => {
  const mockConfigService = {
    get: jest.fn().mockReturnValue('https://app.usewaggz.com'),
  } as unknown as ConfigService;

  const service = new WorkspaceLinkService(mockConfigService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('builds invite url', () => {
    expect(service.inviteUrl('abc123')).toBe(
      'https://app.usewaggz.com/workspace-invite?code=abc123',
    );
  });

  it('builds workspace url', () => {
    expect(service.workspaceUrl('w123')).toBe(
      'https://app.usewaggz.com/w123/workspace',
    );
  });

  it('builds setup workspace url', () => {
    expect(service.setupWorkspaceUrl('prever-1')).toBe(
      'https://app.usewaggz.com/setup/prever-1/workspace',
    );
  });
});
