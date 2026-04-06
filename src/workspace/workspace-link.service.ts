import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WorkspaceLinkService {
  constructor(private readonly configService: ConfigService) {}

  inviteUrl(inviteCode: string): string {
    return `${this.siteUrl}/workspace-invite?inviteCode=${encodeURIComponent(inviteCode)}`;
  }

  loadWorkspaceUrl(workspaceCode: string): string {
    return `${this.siteUrl}/setup/workspace?code=${workspaceCode}`;
  }

  setupWorkspaceUrl(preverificationId: string): string {
    return `${this.siteUrl}/setup/${preverificationId}/workspace`;
  }

  private get siteUrl(): string {
    return this.configService.get<string>('SITE_URL', '');
  }
}
