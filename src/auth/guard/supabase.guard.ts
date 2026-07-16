import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JWT_VERIFIER } from '@/jwt-verifier/consts';
import type JwtVerifier from '@/jwt-verifier/jwt-verifier.interface';
import type { Request } from 'express';
import RequestUser from '@/auth/domain/request-user';
import { ImpersonationService } from '@/impersonation/impersonation.service';
import { IMPERSONATION_SESSION_HEADER } from '@/impersonation/consts';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  logger = new Logger(SupabaseAuthGuard.name);
  constructor(
    @Inject(JWT_VERIFIER) private readonly jwtVerifier: JwtVerifier,
    private readonly impersonationService: ImpersonationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: Request = context.switchToHttp().getRequest<Request>();
    const token = this.extractJWTFromBearerToken(request);

    const { isValid, payload } = await this.jwtVerifier.verifyAndDecode(token);

    if (!isValid) {
      return false;
    }

    let requestUser = new RequestUser(payload.email);
    const sessionId = this.extractImpersonationSessionId(request);

    if (sessionId) {
      if (request.method !== 'GET') {
        throw new ForbiddenException();
      }

      const impersonation = await this.impersonationService.resolveSession(
        sessionId,
        requestUser.email,
      );
      requestUser = requestUser.withImpersonation(impersonation);
    }

    request.user = requestUser;
    return true;
  }

  private extractImpersonationSessionId(request: Request): string | undefined {
    const sessionId = request.headers[IMPERSONATION_SESSION_HEADER];
    if (Array.isArray(sessionId)) {
      return sessionId[0];
    }
    return sessionId;
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
