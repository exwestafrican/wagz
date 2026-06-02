import { Logger } from '@nestjs/common';
import { Command, CommandRunner, Help, Option } from 'nest-commander';
import { PrismaService } from '@/prisma/prisma.service';
import { AuthService } from '@/auth/auth.service';
import { WorkspaceManager } from '@/workspace/workspace-manager.service';
import { CreateSuperAdminStep } from '@/workspace/steps/create-super-admin';
import { CreateSelfConversationStep } from '@/workspace/steps/create-self-conversation';
import { ENVOYE_WORKSPACE_CODE } from '@/feature-flag/const';
import FeatureFlagManager from '@/feature-flag/manager';

interface Options {
  email: string;
}

@Command({
  name: 'setup',
  description:
    'Bootstrap an Envoye workspace: create FeatureFlag, auto-verified user, workspace, super-admin teammate.',
})
export class SetupAdministrativeWorkspaceCommand extends CommandRunner {
  private readonly logger = new Logger(
    SetupAdministrativeWorkspaceCommand.name,
  );

  constructor(
    private readonly prismaService: PrismaService,
    private readonly authService: AuthService,
    private readonly workspaceManager: WorkspaceManager,
    private readonly featureFlagManager: FeatureFlagManager,
    private readonly conversationsService: any,
  ) {
    super();
  }

  async run(_inputs: string[], options: Options) {
    const email = options.email;

    const preverification =
      await this.authService.signupAutoVerifiedForWorkspace(email);

    const workspaceDetails =
      await this.workspaceManager.runPreWorkspaceCreationSteps(
        preverification,
        ENVOYE_WORKSPACE_CODE,
      );

    await this.workspaceManager.runPostWorkspaceCreationSteps(
      workspaceDetails,
      preverification,
      [
        new CreateSuperAdminStep(this.prismaService),
        new CreateSelfConversationStep(
                  this.conversationsService,
                  this.prismaService,
                )
      ],
    );

    this.logger.log(`Successfully created ${workspaceDetails.name}`);
  }

  @Option({
    flags: '--email <email>',
    description: 'Email of the owner to sign up',
    required: true,
  })
  parseEmail(value: string) {
    return value.trim().toLowerCase();
  }

  @Help('after')
  helpText() {
    return [
      '',
      'Examples:',
      '  node dist/src/cli.js setup --email tumise@gmail.com',
      '',
      'Required environment variables (Docker):',
      '  DATABASE_URL, SUPABASE_URL, SUPABASE_KEY (service-role), SITE_URL',
      '',
    ].join('\n');
  }
}
