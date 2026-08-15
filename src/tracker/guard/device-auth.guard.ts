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
    const apiKeyHash = hashDeviceApiKey(apiKey);

    const device = await this.prismaService.device.findUnique({
      where: { apiKeyHash },
    });

    if (!device?.isActive) {
      throw new UnauthorizedException('Invalid or inactive device credentials');
    }

    request.device = device;
    return true;
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
