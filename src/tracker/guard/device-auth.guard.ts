import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { Device } from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { hashDeviceApiKey } from '@/tracker/device-api-key';

export type DeviceAuthenticatedRequest = Request & { device: Device };

@Injectable()
export class DeviceAuthGuard implements CanActivate {
  constructor(private readonly prismaService: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<DeviceAuthenticatedRequest>();
    const apiKey = this.extractApiKeyFromBearerToken(request);
    const keyHash = hashDeviceApiKey(apiKey);

    const credential = await this.prismaService.deviceApiKey.findUnique({
      where: { keyHash },
      include: { device: true },
    });

    if (credential?.isActive && credential?.device.isActive) {
      request.device = credential.device;
      return true;
    }

    throw new UnauthorizedException('Invalid or inactive device credentials');
  }

  private extractApiKeyFromBearerToken(request: Request): string {
    const authHeader = request.headers.authorization;
    const [scheme, token] = authHeader?.split(' ') || [];
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException(
        'Missing or invalid authorization header',
      );
    }
    return token;
  }
}
