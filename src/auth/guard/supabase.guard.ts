import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { JWT_VERIFIER } from '@/jwt-verifier/consts';
import type JwtVerifier from '@/jwt-verifier/jwt-verifier.interface';
import type { Request } from 'express';
import RequestUser from '@/auth/domain/request-user';
import { extractBearerToken } from '@/auth/extract-bearer-token';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  logger = new Logger(SupabaseAuthGuard.name);
  constructor(
    @Inject(JWT_VERIFIER) private readonly jwtVerifier: JwtVerifier,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: Request = context.switchToHttp().getRequest<Request>();
    const token = extractBearerToken(request);

    const { isValid, payload } = await this.jwtVerifier.verifyAndDecode(token);

    if (isValid) {
      request.user = new RequestUser(payload.email);
    }

    return isValid;
  }
}
