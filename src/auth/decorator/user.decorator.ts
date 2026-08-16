import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import RequestUser from '@/auth/domain/request-user';
import type { Request } from 'express';

export const User = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): RequestUser => {
    const request: Request = ctx.switchToHttp().getRequest();
    return request.user as RequestUser;
  },
);
