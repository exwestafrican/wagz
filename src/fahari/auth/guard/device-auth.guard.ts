import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import { Device } from '@/generated/prisma/client';
import { extractBearerToken } from '@/auth/extract-bearer-token';
import { TrackerService } from '@/fahari/tracker/tracker.service';

export type DeviceAuthenticatedRequest = Request & { device: Device };

@Injectable()
export class DeviceAuthGuard implements CanActivate {
  constructor(private readonly trackerService: TrackerService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<DeviceAuthenticatedRequest>();
    const apiKey = extractBearerToken(request);
    request.device = await this.trackerService.validateDeviceApiKey(apiKey);
    return true;
  }
}
