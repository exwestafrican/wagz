import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WorkspaceLinkService {
  constructor(private readonly configService: ConfigService) {}

  inviteUrl(workspaceCode: string): string {
    return `${this.siteUrl}/workspace-invite?code=${workspaceCode}`;
  }

  workspaceUrl(workspaceId: string): string {
    return `${this.siteUrl}/${workspaceId}/workspace`;
  }

  setupWorkspaceUrl(preverificationId: string): string {
    return `${this.siteUrl}/setup/${preverificationId}/workspace`;
  }

  private get siteUrl(): string {
    return this.configService.get<string>('SITE_URL', '');
  }
}
