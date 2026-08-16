import { Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { WorkspaceDetails } from '@/envoye/workspace/domain/workspace-details';
import { PostSetupStep } from '@/envoye/workspace/steps/postsetup-step';
import { ROLES } from '@/common/permission/types';
import normalizeUsername from '@/common/normalize-username';

export class CreateWorkspaceAdminStep implements PostSetupStep {
  logger = new Logger(CreateWorkspaceAdminStep.name);
  constructor(private readonly prismaService: PrismaService) {}

  async execute(workspaceDetails: WorkspaceDetails): Promise<void> {
    const pointOfContact = workspaceDetails.pointOfContact;
    await this.prismaService.teammate.create({
      data: {
        email: pointOfContact.email,
        firstName: pointOfContact.firstName,
        lastName: pointOfContact.lastName,
        username: pointOfContact.username,
        normalizedUsername: normalizeUsername(pointOfContact.username),
        workspaceCode: workspaceDetails.code,
        groups: [ROLES.WorkspaceAdmin.code],
      },
    });
    this.logger.log(
      `Successfully create teammate for company; companyName=${workspaceDetails.name} workspaceId=${workspaceDetails.workspaceId}`,
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
      `Removing teammate for company as compensating action; companyName=${workspaceDetails.name} workspaceId=${workspaceDetails.workspaceId}`,
    );
  }
}
