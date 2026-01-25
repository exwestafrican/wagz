import { Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { WorkspaceDetails } from '@/workspace/domain/WorkspaceDetails';
import { PostSetupStep } from '@/workspace/steps/postsetup-step';

export class CreateTeammateStep implements PostSetupStep {
  logger = new Logger(CreateTeammateStep.name);
  constructor(private readonly prismaService: PrismaService) {}

  async execute(workspaceDetails: WorkspaceDetails): Promise<void> {
    const pointOfContact = workspaceDetails.pointOfContact;
    await this.prismaService.teammate.create({
      data: {
        email: pointOfContact.email,
        firstName: pointOfContact.firstName,
        lastName: pointOfContact.lastName,
        workspaceId: workspaceDetails.workspaceId,
      },
    });
    this.logger.log(
      `Successfully create teammate for company; companyName=${workspaceDetails.name} workspaceId=${workspaceDetails.workspaceId}`,
    );
  }

  async compensate(workspaceDetails: WorkspaceDetails) {
    await this.prismaService.teammate.delete({
      where: {
        email_workspaceId: {
          email: workspaceDetails.pointOfContact.email,
          workspaceId: workspaceDetails.workspaceId,
        },
      },
    });
    this.logger.warn(
      `Removing teammate for company as compensating action; companyName=${workspaceDetails.name} workspaceId=${workspaceDetails.workspaceId}`,
    );
  }
}
