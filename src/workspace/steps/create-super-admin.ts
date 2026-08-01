import { Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { WorkspaceDetails } from '@/workspace/domain/workspace-details';
import { PostSetupStep } from '@/workspace/steps/postsetup-step';
import { ROLES } from '@/permission/types';
import buildUsername from '@/common/build-username';
import normalizeUsername from '@/common/normalize-username';

export class CreateSuperAdminStep implements PostSetupStep {
  logger = new Logger(CreateSuperAdminStep.name);
  constructor(private readonly prismaService: PrismaService) {}

  async execute(workspaceDetails: WorkspaceDetails): Promise<void> {
    const pointOfContact = workspaceDetails.pointOfContact;
    const username = buildUsername(
      pointOfContact.firstName,
      pointOfContact.lastName,
    );
    await this.prismaService.teammate.create({
      data: {
        email: pointOfContact.email,
        firstName: pointOfContact.firstName,
        lastName: pointOfContact.lastName,
        username,
        normalizedUsername: normalizeUsername(username),
        workspaceCode: workspaceDetails.code,
        groups: [ROLES.SuperAdmin.code],
      },
    });
    this.logger.log(
      `Successfully created super admin teammate; workspaceId=${workspaceDetails.workspaceId}`,
    );
  }

  async compensate(workspaceDetails: WorkspaceDetails) {
    await this.prismaService.teammate.delete({
      where: {
        workspaceCode_email: {
          workspaceCode: workspaceDetails.code,
          email: workspaceDetails.pointOfContact.email,
        },
      },
    });
    this.logger.warn(
      `Removing teammate as compensating action; workspaceId=${workspaceDetails.workspaceId}`,
    );
  }
}
