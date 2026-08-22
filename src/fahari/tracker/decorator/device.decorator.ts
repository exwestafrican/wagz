import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Device } from '@/generated/prisma/client';
import type { DeviceAuthenticatedRequest } from '@/fahari/auth/guard/device-auth.guard';

export const AuthenticatedDevice = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Device => {
    const request = ctx.switchToHttp().getRequest<DeviceAuthenticatedRequest>();
    return request.device;
  },
);
