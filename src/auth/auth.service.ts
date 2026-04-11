import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthError, SupabaseClient } from '@supabase/supabase-js';
import { AccountExistsException } from './exceptions/account.exists';
import PasswordGenerator from './services/password.generator';
import { PrismaService } from '@/prisma/prisma.service';
import SignupDetails from './domain/signup.details';
import { PreVerification, Prisma } from '@/generated/prisma/client';
import PRISMA_CODES from '@/prisma/consts';
import { TeammatesService } from '@/teammates/teammates.service';
import { LinkService } from '@/common/link-service';

@Injectable()
export class AuthService {
  logger = new Logger(AuthService.name);
  constructor(
    private readonly supabaseClient: SupabaseClient,
    private readonly passwordGenerator: PasswordGenerator,
    private readonly prismaService: PrismaService,
    private readonly linkService: LinkService,
    private readonly teammatesService: TeammatesService,
  ) {}

  private async signInWithOtp(
    email: string,
    workspaceCode: string,
  ): Promise<void> {
    const { error } = await this.supabaseClient.auth.signInWithOtp({
      email: email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: this.linkService.loadWorkspaceUrl(workspaceCode),
      },
    });

    if (error) {
      this.logger.error(error);
      throw new UnauthorizedException();
    }
  }

  async requestMagicLink(email: string): Promise<void> {
    const primaryWorkspace =
      await this.teammatesService.primaryWorkspace(email);
    await this.signInWithOtp(email, primaryWorkspace.code);
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
          timezone: signupDetails.timezone,
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

  private handleAuthError(error: AuthError) {
    this.logger.error(error);
    if (error.code === 'user_already_exists' || error.code === 'email_exists') {
      throw new AccountExistsException(error.message); // this is thrown when user has verified email
    } else {
      //TODO: we need to alert outselves of every error here except for the AccountExistsException
      // store this users email and contact them.
      throw new ServiceUnavailableException(error.message);
    }
  }

  async signTeammateUpAndPushMagicLink(email: string, workspaceCode: string) {
    try {
      const password = this.passwordGenerator.generateRandomPassword();
      const { error } = await this.supabaseClient.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
      });
      if (error) {
        this.handleAuthError(error);
      }
      await this.signInWithOtp(email, workspaceCode);
    } catch (e) {
      if (e instanceof AccountExistsException) {
        // user might exist in another workspace with same email just log user in
        await this.signInWithOtp(email, workspaceCode);
        return;
      }
      throw e;
    }
  }

  async signup(signupDetails: SignupDetails, password: string): Promise<void> {
    const preverificationDetails =
      await this.storePreverificationDetails(signupDetails);

    const { error } = await this.supabaseClient.auth.signUp({
      email: signupDetails.email,
      password,
      options: {
        emailRedirectTo: this.linkService.setupWorkspaceUrl(
          preverificationDetails.id,
        ),
      },
    });

    if (error) {
      this.handleAuthError(error);
    }
  }
}
