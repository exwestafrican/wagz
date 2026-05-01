import { Logger } from '@nestjs/common';
import { Command, CommandRunner, Help, Option } from 'nest-commander';
import { PrismaService } from '@/prisma/prisma.service';
import { existsInDbError } from '@/common/error-type';
import { FeatureFlagStatus } from '@/generated/prisma/enums';
import { AuthService } from '@/auth/auth.service';
import { WorkspaceManager } from '@/workspace/workspace-manager.service';
import { CreateSuperAdminStep } from '@/workspace/steps/create-super-admin';
import { ENVOYE_WORKSPACE_CODE } from '@/feature-flag/const';

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
  ) {
    super();
  }

  async run(_inputs: string[], options: Options) {
    const email = options.email;

    await this.createAdministrativeWorkspaceFeatureFlag(email);

    // todo ensure pre verification is verified
    // ensure we have a super admin
    // can create even if email used for another workspace
    // will not update verification date

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
      [new CreateSuperAdminStep(this.prismaService)],
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

  private async createAdministrativeWorkspaceFeatureFlag(addedBy: string) {
    try {
      await this.prismaService.featureFlag.create({
        data: {
          key: 'feature_administrative_workspace',
          name: 'Administrative workspace',
          description: 'Enables administrative workspace behavior',
          status: FeatureFlagStatus.DISABLED,
          addedBy,
        },
      });
    } catch (e) {
      if (existsInDbError(e)) {
        return;
      }
      throw e;
    }
  }
}
