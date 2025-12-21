import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { MagicLinkAuthDto } from './dto/magic-link-auth';
import { SupabaseClient } from '@supabase/supabase-js';
import { AccountExistsException } from './exceptions/account.exists';
import PasswordGenerator from './services/password.generator';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  logger = new Logger(AuthService.name);
  constructor(
    private readonly supabaseClient: SupabaseClient,
    private readonly passwordGenerator: PasswordGenerator,
    private readonly configService: ConfigService,
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  requestMagicLink(_magicLinkAuthDto: MagicLinkAuthDto): void {
    // ...
  }

  async emailOnlySignup(email: string): Promise<void> {
    const password = this.passwordGenerator.generateRandomPassword();
    return await this.signup(email, password);
  }

  async signup(email: string, password: string): Promise<void> {
    //TODO: check if the email is valid throw error or return void
    // we need to do things like see if this is a fake email or temproary generated email.
    //TODO: add aditional meta data
    const { error } = await this.supabaseClient.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: this.configService.get<string>('EMAIL_REDIRECT_URL'),
      },
    });

    if (error !== null) {
      this.logger.error(error);
      if (error.code === 'user_already_exists') {
        throw new AccountExistsException(error.message);
      } else {
        //TODO: we need to alert outselves of every error here except for the AccountExistsException
        // store this users email and contact them.
        throw new ServiceUnavailableException(error.message);
      }
    }
  }
}
