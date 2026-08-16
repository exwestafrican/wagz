import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { Device } from '@/generated/prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';
import { hashDeviceApiKey } from '@/fahari/auth/device-api-key';
import { extractBearerToken } from '@/common/auth/extract-bearer-token';

export type DeviceAuthenticatedRequest = Request & { device: Device };

@Injectable()
export class DeviceAuthGuard implements CanActivate {
  constructor(private readonly prismaService: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<DeviceAuthenticatedRequest>();
    const apiKey = extractBearerToken(request);
    const keyHash = hashDeviceApiKey(apiKey);

    const credential = await this.prismaService.deviceApiKey.findUnique({
      where: { keyHash },
      include: { device: true },
    });

    const credentialIsActive = credential?.isActive === true;
    const deviceIsActive = credential?.device.isActive === true;

    if (credentialIsActive && deviceIsActive) {
      request.device = credential.device;
      return true;
    }

    throw new UnauthorizedException('Invalid or inactive device credentials');
  }
}
