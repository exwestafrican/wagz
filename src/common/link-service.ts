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

  adminLoginUrl(): string {
    return `${this.siteUrl}/admin`;
  }

  conversationUrl(workspaceCode: string, conversationId: number): string {
    return `${this.siteUrl}/workspace/conversation?code=${workspaceCode}&conversationId=${conversationId}`;
  }

  private get siteUrl(): string {
    return this.configService.get<string>('SITE_URL', '');
  }
}
