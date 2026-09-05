import { Logger, ServiceUnavailableException } from '@nestjs/common';
import { Command, CommandRunner, Help, Option } from 'nest-commander';
import { AuthError, SupabaseClient } from '@supabase/supabase-js';
import { generate } from 'generate-password';
import { PrismaService } from '@/prisma/prisma.service';
import { existsInDbError } from '@/common/error-type';
import ItemAlreadyExistsInDb from '@/common/exceptions/conflict';

interface Options {
  email: string;
  firstname: string;
  lastname: string;
}

@Command({
  name: 'create-super-admin',
  description: 'Create a Fahari super admin user.',
})
export class CreateSuperAdminCommand extends CommandRunner {
  private readonly logger = new Logger(CreateSuperAdminCommand.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly supabaseClient: SupabaseClient,
  ) {
    super();
  }

  async run(_inputs: string[], options: Options) {
    const email = options.email.trim().toLowerCase();
    const firstname = options.firstname;
    const lastname = options.lastname;

    await this.createSupabaseUser(email, firstname, lastname);

    try {
      const createdUser = await this.prismaService.user.create({
        data: {
          email,
          firstname,
          lastname,
          isSuperAdmin: true,
        },
      });
      this.logger.log(
        `Successfully created super admin; id=${createdUser.id} email=${createdUser.email}`,
      );
    } catch (error) {
      if (existsInDbError(error)) {
        throw new ItemAlreadyExistsInDb(
          `user with email already exists; email=${email}`,
        );
      }
      throw error;
    }
  }

  private async createSupabaseUser(
    email: string,
    firstname: string,
    lastname: string,
  ): Promise<void> {
    const { error } = await this.supabaseClient.auth.admin.createUser({
      email,
      password: this.randomPassword(),
      email_confirm: true,
      user_metadata: { firstname, lastname },
    });
    if (!error) {
      return;
    }
    if (this.supabaseUserAlreadyExists(error)) {
      this.logger.log(`Supabase user already exists; email=${email}`);
      return;
    }
    this.logger.error(error);
    throw new ServiceUnavailableException(error.message);
  }

  private supabaseUserAlreadyExists(error: AuthError) {
    return (
      error.code === 'user_already_exists' || error.code === 'email_exists'
    );
  }

  private randomPassword(): string {
    return generate({
      length: 12,
      numbers: true,
      symbols: true,
      uppercase: true,
      lowercase: true,
      excludeSimilarCharacters: true,
      strict: true,
    });
  }

  @Option({
    flags: '--email <email>',
    description: 'Email of the super admin',
    required: true,
  })
  parseEmail(value: string) {
    return value.trim().toLowerCase();
  }

  @Option({
    flags: '--firstname <firstname>',
    description: 'First name of the super admin',
    required: true,
  })
  parseFirstname(value: string) {
    return value.trim();
  }

  @Option({
    flags: '--lastname <lastname>',
    description: 'Last name of the super admin',
    required: true,
  })
  parseLastname(value: string) {
    return value.trim();
  }

  @Help('after')
  helpText() {
    return [
      '',
      'Examples:',
      '  node dist/src/cli.js create-super-admin --email tumise@gmail.com --firstname Tumise --lastname Adekoya',
      '',
      'Required environment variables (Docker):',
      '  DATABASE_URL, SUPABASE_URL, SUPABASE_KEY (service-role)',
      '',
    ].join('\n');
  }
}
