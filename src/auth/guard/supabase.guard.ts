import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JWT_VERIFIER } from '@/auth/consts';
import type JwtVerifier from '@/auth/services/jwt-verifier';
import type { Request } from 'express';
import RequestUser from '@/auth/domain/request-user';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  logger = new Logger(SupabaseAuthGuard.name);
  constructor(
    @Inject(JWT_VERIFIER) private readonly jwtVerifier: JwtVerifier,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: Request = context.switchToHttp().getRequest<Request>();
    const token = this.extractJWTFromBearerToken(request);
    const verify = await this.jwtVerifier.verify(token);
    if (verify) {
      const payload = await this.jwtVerifier.decode(token);
      request.user = new RequestUser(payload.email);
      return true;
    }
    return false;
  }

  private extractJWTFromBearerToken(request: Request): string {
    const authHeader = request.headers.authorization;
    const [, token] = authHeader?.split(' ') || ['Bearer', ''];
    if (!token) {
      throw new UnauthorizedException(
        'Missing or invalid authorization header',
      );
    }
    return token;
  }
}
