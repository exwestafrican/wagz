import { Injectable, Logger } from '@nestjs/common';
import {
  CompanyProfile,
  PreVerification,
  PreVerificationStatus,
  Prisma,
} from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { generate } from 'generate-password';
import { WorkspaceDetails } from '@/workspace/domain/workspace-details';
import { PointOfContact } from '@/workspace/domain/point-of-contact';
import { PostSetupStep } from '@/workspace/steps/postsetup-step';
import { CreateWorkspaceAdminStep } from '@/workspace/steps/create-workspace-admin';
import PRISMA_CODES from '@/prisma/consts';
import NotFoundInDb from '@/common/exceptions/not-found';
import { InvalidState } from '@/common/exceptions/invalid-state';

@Injectable()
export class WorkspaceManager {
  logger = new Logger(WorkspaceManager.name);
  constructor(private readonly prismaService: PrismaService) {}

  private async runPreWorkspaceCreationSteps(
    preVerification: PreVerification,
  ): Promise<WorkspaceDetails> {
    return this.prismaService.$transaction(async (tx) => {
      const companyProfile: CompanyProfile = await tx.companyProfile.create({
        data: {
          companyName: preVerification.companyName,
          pointOfContactEmail: preVerification.email,
          phoneCountryCode: preVerification.phoneCountryCode,
          phoneNumber: preVerification.phoneNumber,
        },
      });
      const pointOfContact = PointOfContact.from(preVerification);
      this.logger.log(
        `Successfully created profile for company; companyName=${preVerification.companyName} CompanyProfileId=${companyProfile.id}`,
      );

      const workspace = await tx.workspace.create({
        data: {
          name: companyProfile.companyName,
          ownedById: companyProfile.id,
          code: this.generateWorkspaceCode(),
        },
      });

      this.logger.log(
        `Successfully create workspace for company; companyName=${preVerification.companyName} CompanyProfileId=${companyProfile.id} workspaceId=${workspace.id}`,
      );

      return WorkspaceDetails.from(workspace, pointOfContact);
    });
  }

  private async rollBackPreWorkspaceCreationSteps(
    workspaceDetails: WorkspaceDetails,
  ): Promise<void> {
    await this.prismaService.companyProfile.delete({
      where: { id: workspaceDetails.ownedByCompanyId },
    });
  }

  private generateWorkspaceCode() {
    //TODO move this to a service using factory?
    return generate({
      length: 6,
      numbers: true,
      symbols: false,
      uppercase: false,
      lowercase: true,
      excludeSimilarCharacters: true, // Excludes i, l, 1, L, o, 0, O, etc.
      strict: true, // Ensures at least one character from each pool
    });
  }

  private async getDetailsOrThrow(
    ownerEmail: string,
    preVerificationId: string,
  ): Promise<PreVerification> {
    try {
      const preverificationDetails =
        await this.prismaService.preVerification.findUniqueOrThrow({
          where: {
            id: preVerificationId,
            email: ownerEmail,
          },
        });
      this.ensurePreverificationStateIsValid(preverificationDetails);
      return preverificationDetails;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === PRISMA_CODES.NOT_FOUND
      ) {
        this.logger.warn(
          `invalid setup attempt for preVerificationId ${preVerificationId}`,
        );
        throw new NotFoundInDb('invalid preverification');
      }
      throw error;
    }
  }

  private ensurePreverificationStateIsValid(preVerification: PreVerification) {
    if (preVerification.status !== PreVerificationStatus.PENDING) {
      throw new InvalidState(
        `invalid state for preVerificationId=${preVerification.id} status=${preVerification.status}`,
      );
    }
  }

  async setup(
    ownerEmail: string,
    preVerificationId: string,
  ): Promise<WorkspaceDetails> {
    const postWorkspaceSetupSteps: PostSetupStep[] = [
      new CreateWorkspaceAdminStep(this.prismaService),
    ];
    const completedSteps: PostSetupStep[] = [];
    const preverificationDetails = await this.getDetailsOrThrow(
      ownerEmail,
      preVerificationId,
    );

    const workspaceDetails = await this.runPreWorkspaceCreationSteps(
      preverificationDetails,
    );

    try {
      for (const step of postWorkspaceSetupSteps) {
        await step.execute(workspaceDetails);
        completedSteps.push(step);
      }
      await this.prismaService.preVerification.update({
        where: { id: preVerificationId },
        data: {
          status: PreVerificationStatus.VERIFIED,
        },
      });
      return workspaceDetails;
    } catch (error) {
      this.logger.error(
        `Workspace setup failed, rolling back completed steps; steps=[${completedSteps.map((step) => step.constructor.name).join(', ')}] preverificationId=${preverificationDetails.id} `,
        error,
      );
      const reversedCompletedSteps = [...completedSteps].reverse();
      for (const step of reversedCompletedSteps) {
        await step.compensate(workspaceDetails);
      }
      await this.rollBackPreWorkspaceCreationSteps(workspaceDetails);
      throw error;
    }
  }
}
