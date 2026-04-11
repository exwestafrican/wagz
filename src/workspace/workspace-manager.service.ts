import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  CompanyProfile,
  InviteStatus,
  PreVerification,
  PreVerificationStatus,
  Prisma,
  Workspace as PrismaWorkspace,
  Teammate,
  WorkspaceInvite,
} from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { generate } from 'generate-password';
import { Workspace } from '@/workspace/dto/workspace-response.dto';
import { WorkspaceDetails } from '@/workspace/domain/workspace-details';
import { PointOfContact } from '@/workspace/domain/point-of-contact';
import { PostSetupStep } from '@/workspace/steps/postsetup-step';
import { CreateWorkspaceAdminStep } from '@/workspace/steps/create-workspace-admin';
import PRISMA_CODES from '@/prisma/consts';
import NotFoundInDb from '@/common/exceptions/not-found';
import { InvalidState } from '@/common/exceptions/invalid-state';
import { Role } from '@/permission/domain/role';
import { sentenceCase, Time } from '@/common/utils';
import { render } from '@react-email/render';
import { WorkspaceInviteTemplate } from '@/emails/templates/workspace-invite-template';
import React from 'react';
import { EMAIL_CLIENT, type EmailClient } from '@/messaging/email/email-client';
import { RoleService } from '@/permission/role/role.service';
import { ConcurrentLimit } from '@/common/concurrent-runner';
import { WorkspaceInviteService } from '@/workspace/workspace-invite-service';
import { LinkService } from '@/link-service';

@Injectable()
export class WorkspaceManager {
  private static readonly INVITE_CONCURRENCY = 3;
  logger = new Logger(WorkspaceManager.name);

  constructor(
    private readonly prismaService: PrismaService,
    @Inject(EMAIL_CLIENT) private readonly emailClient: EmailClient,
    private readonly linkService: LinkService,
    private readonly roleService: RoleService,
    private readonly workspaceInviteService: WorkspaceInviteService,
  ) {}

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

  async details(code: string): Promise<Workspace> {
    const workspace = await this.prismaService.workspace.findUnique({
      where: { code },
    });
    if (!workspace) {
      throw new NotFoundInDb('Workspace not found');
    }
    return {
      code: workspace.code,
      status: workspace.status,
      name: workspace.name,
    };
  }

  async inviteTeammateIfEligible(
    workspace: PrismaWorkspace,
    recipientEmail: string,
    senderId: number,
    role: Role,
  ): Promise<WorkspaceInvite> {
    const teammateIsInWorkspace = await this.teammateAlreadyExistsInWorkspace(
      workspace.code,
      recipientEmail,
    );
    if (teammateIsInWorkspace) {
      const invite = await this.prismaService.workspaceInvite.create({
        data: {
          ...this.baseSetup(workspace.code, recipientEmail, senderId, role),
          status: InviteStatus.FAILED,
        },
      });
      this.logger.log(
        `Failed to send workspace invite because user is in workspace invite=${invite.id}  workspaceCode=${workspace.code}`,
      );
      return invite;
    } else {
      //TODO: debounce send-email
      return await this.tryToSendWorkspaceInvite(
        workspace,
        recipientEmail,
        senderId,
        role,
      );
    }
  }
  async inviteEligibleTeammates(
    sender: Teammate,
    recipientEmails: string[],
    assignedRole: string,
  ): Promise<void> {
    const workspace = await this.prismaService.workspace.findUniqueOrThrow({
      where: { code: sender.workspaceCode },
    });
    const role = this.roleService.fetchRole(assignedRole)!;
    const limit = ConcurrentLimit(
      WorkspaceManager.INVITE_CONCURRENCY,
      recipientEmails.length,
    );
    await Promise.allSettled(
      recipientEmails.map((recipientEmail) =>
        limit.run(() =>
          this.inviteTeammateIfEligible(
            workspace,
            recipientEmail,
            sender.id,
            role,
          ),
        ),
      ),
    );
  }

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
          timezone: preVerification.timezone,
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

  private baseSetup(
    workspaceCode: string,
    recipientEmail: string,
    senderId: number,
    role: Role,
  ) {
    return {
      recipientEmail: recipientEmail,
      workspaceCode: workspaceCode,
      inviteCode: this.generateCode(),
      senderId: senderId,
      recipientRole: role.code,
      validTill: this.validTill(),
    };
  }

  private async tryToSendWorkspaceInvite(
    workspace: PrismaWorkspace,
    recipientEmail: string,
    senderId: number,
    role: Role,
  ): Promise<WorkspaceInvite> {
    const workspaceInvite = await this.prismaService.workspaceInvite.create({
      data: {
        ...this.baseSetup(workspace.code, recipientEmail, senderId, role),
        status: InviteStatus.SENT,
      },
    });

    try {
      const sender = await this.prismaService.teammate.findUniqueOrThrow({
        where: { id: senderId },
      });

      const encodedInviteCode = this.workspaceInviteService.encodeInvite(
        recipientEmail,
        workspace.code,
        workspaceInvite.inviteCode,
      );

      const inviteLink = this.linkService.inviteUrl(encodedInviteCode);

      const emailHtml = await render(
        React.createElement(WorkspaceInviteTemplate, {
          senderName: sentenceCase(sender.firstName),
          workspaceName: workspace.name
            .split(' ')
            .map((n) => sentenceCase(n))
            .join(' '),
          inviteLink,
        }),
      );

      await this.emailClient.send({
        from: { email: sender.email, name: sender.firstName },
        to: { email: recipientEmail, name: '' },
        subject: 'Workspace Invite',
        html: emailHtml,
      });
      return workspaceInvite;
    } catch (error) {
      const failedWorkspaceInvite =
        await this.prismaService.workspaceInvite.update({
          where: { id: workspaceInvite.id },
          data: {
            status: InviteStatus.FAILED,
          },
        });
      this.logger.error(
        `Failed to send workspace invite for invite=${failedWorkspaceInvite.id} workspaceCode=${workspace.code}`,
      );
      this.logger.error(error);
      return failedWorkspaceInvite;
    }
  }
}
