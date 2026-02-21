import { Injectable, Logger } from '@nestjs/common';
import {
  CompanyProfile,
  InviteStatus,
  PreVerification,
  PreVerificationStatus,
  Prisma,
  WorkspaceInvite,
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
import { Role } from '@/permission/domain/role';
import { Time } from '@/common/utils';

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
          code: this.generateCode(),
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

  private generateCode() {
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

  private validTill(): Date {
    const currentTime = Date.now();
    const expiresOnDay = currentTime + Time.durationInMilliseconds.days(2);
    const endOfTodayUtc = new Date(expiresOnDay);
    return new Date(endOfTodayUtc.setUTCHours(23, 59, 59, 999));
  }

  private async teammateAlreadyExistsInWorkspace(
    workspaceCode: string,
    email: string,
  ) {
    return (
      (await this.prismaService.teammate.count({
        where: {
          email: email,
          workspaceCode: workspaceCode,
        },
      })) > 0
    );
  }

  async inviteTeammateIfEligible(
    workspaceCode: string,
    recepientEmail: string,
    senderId: number,
    role: Role,
  ): Promise<WorkspaceInvite> {
    const baseSetup = {
      recipientEmail: recepientEmail,
      workspaceCode: workspaceCode,
      inviteCode: this.generateCode(),
      senderId: senderId,
      recipientRole: role.code,
      validTill: this.validTill(),
    };

    if (
      await this.teammateAlreadyExistsInWorkspace(workspaceCode, recepientEmail)
    ) {
      return this.prismaService.workspaceInvite.create({
        data: { ...baseSetup, status: InviteStatus.SENT },
      });
    } else {
      return this.prismaService.workspaceInvite.create({
        data: { ...baseSetup, status: InviteStatus.SENT },
      });
    }
  }
  //
  // async inviteTeammateIfEligible() {
  //
  // }
  // ensure user is admin, and belongs to workspace => only user with role adim can call endpoint
  //
  // async invite(
  //   workspaceCode: string,
  //   senderId: number,
  //   adminInvites: Array<AdminInvite>,
  // ) {
  //   // we want to debounce emails? if we already send an invite.
  //   // let give about 5 minutes
  //
  //   // const workspaceInvites = await this.prismaService.workspaceInvite.findMany({
  //   //   where: {
  //   //     workspaceCode: workspaceCode,
  //   //     recipientEmail: {
  //   //       in: adminInvites.map((invitee) => invitee.email),
  //   //     },
  //   //   },
  //   // });
  //   //
  //   // const groupedWorkspaceInvites = groupBy(
  //   //   workspaceInvites,
  //   //   (workspaceInvite) => workspaceInvite.recipientEmail,
  //   // );
  //
  //   // take the most recent per person
  //   for (const adminInvite of adminInvites) {
  //     const workspaceInvite =
  //       await this.prismaService.workspaceInvite.findFirst({
  //         where: {
  //           workspaceCode: workspaceCode,
  //           recipientEmail: adminInvite.email,
  //         },
  //         orderBy: {
  //           createdAt: 'desc',
  //         },
  //       });
  //
  //     if (!workspaceInvite) {
  //       // send email
  //     }
  //     //if invite has expired -> create new invite then send
  //     // if invite is pending -> skip
  //     // if invite is accepted ->  if teammate is still active (skip) else send
  //   }
  // }

  //TODO: how do we confirm email was sent?
  // 1. generate invite link ?

  // 1. create invite with pending
  // 2. after sending update status to SENT.
  // 3. after clicking on link, updated to ACCEPTED

  // 1. Check if user has invites
  // pending: skip wait till expired
  // sent: skip
  //  expired:  create new invite
  //  accepted: check if user is still in workspace. i.e fetch teammate if exists, skip else, create new invite and follow flow
  // 2. Test that if invite was previously sent we don't send another ?
  //
}
