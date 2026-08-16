import { UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';

export function extractBearerToken(request: Request): string {
  const authHeader = request.headers.authorization;
  const [scheme, token] = authHeader?.split(' ') || [];
  if (scheme !== 'Bearer' || !token) {
    throw new UnauthorizedException('Missing or invalid authorization header');
  }
  return token;
}
