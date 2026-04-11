import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';

@Injectable()
export class LinkService {
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

  workspaceUrl(workspaceCode: string): string {
    return `${this.siteUrl}/workspace?code=${workspaceCode}`;
  }

  private get siteUrl(): string {
    return this.configService.get<string>('SITE_URL', '');
  }
}
