import {
  ForbiddenException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { LinkService } from '@/common/link-service';
import { FahariPermissionService } from '@/fahari/permission/permission.service';
import RequestUser from '@/auth/domain/request-user';
import OtpVerification from '@/fahari/auth/domain/otp-verification';

@Injectable()
export class AuthService {
  logger = new Logger(AuthService.name);

  constructor(
    private readonly supabaseClient: SupabaseClient,
    private readonly linkService: LinkService,
    private readonly fahariPermissionService: FahariPermissionService,
  ) {}

  async requestAdminMagicLinkOrThrow(email: string): Promise<void> {
    try {
      await this.fahariPermissionService.runIfSuperAdmin(
        RequestUser.of(email),
        () => this.signInWithOtp(email),
      );
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw new UnauthorizedException();
      }
      throw error;
    }
  }

  private async signInWithOtp(email: string): Promise<void> {
    const { error } = await this.supabaseClient.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: this.linkService.fahariAdminLoginUrl(),
      },
    });
    if (error) {
      this.logger.error(error);
      throw new UnauthorizedException();
    }
  }

  async verifyOtpOrThrow(email: string, otp: string): Promise<OtpVerification> {
    const {
      data: { session },
      error,
    } = await this.supabaseClient.auth.verifyOtp({
      email,
      token: otp,
      type: 'email',
    });

    if (error) {
      this.logger.error(error);
      throw new UnauthorizedException();
    } else if (!session) {
      this.logger.error('No session returned after OTP verification');
      throw new ServiceUnavailableException();
    } else {
      const { access_token, user } = session;
      this.logger.log(`OTP verified successfully for user: ${user.id}`);
      return {
        accessToken: access_token,
      };
    }
  }
}
