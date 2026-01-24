import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { AccountExistsException } from './exceptions/account.exists';
import PasswordGenerator from './services/password.generator';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import SignupDetails from './domain/signup.details';
import { PreVerification, Prisma } from '@/generated/prisma/client';
import PRISMA_CODES from '@/prisma/consts';

@Injectable()
export class AuthService {
  logger = new Logger(AuthService.name);
  constructor(
    private readonly supabaseClient: SupabaseClient,
    private readonly passwordGenerator: PasswordGenerator,
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
  ) {}

  async requestMagicLink(email: string): Promise<void> {
    const { error } = await this.supabaseClient.auth.signInWithOtp({
      email: email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: this.dashboardUrl('1'),
      },
    });

    if (error) {
      this.logger.error(error);
      throw new UnauthorizedException();
    }
  }

  async emailOnlySignup(signupDetails: SignupDetails): Promise<void> {
    const password = this.passwordGenerator.generateRandomPassword();
    return await this.signup(signupDetails, password);
  }

  private existsInDBError(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === PRISMA_CODES.DUPLICATE_KEY_CONSTRAINT_VIOLATION
    );
  }

  private async storePreverificationDetails(
    signupDetails: SignupDetails,
  ): Promise<PreVerification> {
    try {
      const preVerification = await this.prismaService.preVerification.create({
        data: {
          email: signupDetails.email,
          firstName: signupDetails.firstName,
          lastName: signupDetails.lastName,
          companyName: signupDetails.companyName,
        },
      });
      this.logger.log(`PreVerification successful Id=${preVerification.id}`);
      return preVerification;
    } catch (e) {
      if (this.existsInDBError(e)) {
        const preVerification =
          await this.prismaService.preVerification.findUniqueOrThrow({
            where: { email: signupDetails.email },
          });

        this.logger.log(
          `User already exists in the pre verification table Id=${preVerification.id}`,
        );
        return preVerification;
      } else {
        this.logger.error(e);
        throw e;
      }
    }
  }

  private dashboardUrl(id: string): string {
    const siteUrl = this.configService.get<string>('SITE_URL');
    return `${siteUrl}/${id}/workspace`;
  }

  private get setupDashboardUrl(): string {
    const siteUrl = this.configService.get<string>('SITE_URL');
    return `${siteUrl}/setup/workspace`;
  }

  async signup(signupDetails: SignupDetails, password: string): Promise<void> {
    const { error } = await this.supabaseClient.auth.signUp({
      email: signupDetails.email,
      password,
      options: {
        emailRedirectTo: this.setupDashboardUrl,
      },
    });

    if (error === null) {
      await this.storePreverificationDetails(signupDetails);
    } else {
      this.logger.error(error);
      if (error.code === 'user_already_exists') {
        throw new AccountExistsException(error.message); // this is thrown when user has verified email
      } else {
        //TODO: we need to alert outselves of every error here except for the AccountExistsException
        // store this users email and contact them.
        throw new ServiceUnavailableException(error.message);
      }
    }
  }
}
