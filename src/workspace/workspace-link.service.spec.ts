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
      'https://app.usewaggz.com/workspace-invite?inviteCode=abc123',
    );
  });

  it('encodes invite code for query string safety', () => {
    expect(service.inviteUrl('a+b/c==')).toBe(
      'https://app.usewaggz.com/workspace-invite?inviteCode=a%2Bb%2Fc%3D%3D',
    );
  });

  it('builds workspace url', () => {
    expect(service.loadWorkspaceUrl('w123')).toBe(
      'https://app.usewaggz.com/setup/workspace?code=w123',
    );
  });

  it('builds setup workspace url', () => {
    expect(service.setupWorkspaceUrl('prever-1')).toBe(
      'https://app.usewaggz.com/setup/prever-1/workspace',
    );
  });
});
