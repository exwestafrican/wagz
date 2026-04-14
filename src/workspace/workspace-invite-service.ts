import { Injectable, Logger } from '@nestjs/common';
import { InvalidInviteCode } from '@/common/exceptions/invalid-code';
import { PrismaService } from '@/prisma/prisma.service';
import { isEmpty } from '@/common/utils';
import { InviteStatus } from '@/generated/prisma/enums';
import { AuthService } from '@/auth/auth.service';
import { WorkspaceInvite } from '@/generated/prisma/client';

export interface TeammateDetails {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
}

export interface DecodedResult {
  recipientEmail: string;
  workspaceCode: string;
  codeInInvite: string;
}

@Injectable()
export class WorkspaceInviteService {
  logger = new Logger(WorkspaceInviteService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly authService: AuthService,
  ) {}

  encodeInvite(
    recipientEmail: string,
    workspaceCode: string,
    inviteCode: string,
  ): string {
    // remember to encodeURIComponent when using this in url
    const valueToEncode = [recipientEmail, workspaceCode, inviteCode].join(',');
    return Buffer.from(valueToEncode, 'utf8')
      .toString('base64')
      .replace(/=+$/, ''); // remove all ==
  }

  decodeInviteOrThrow(inviteCode: string): DecodedResult {
    const decoded = this.decodedValue(inviteCode);
    const [recipientEmail, workspaceCode, codeInInvite] = decoded.split(',');
    return {
      recipientEmail,
      workspaceCode,
      codeInInvite,
    };
  }

  async decodeAndVerifyOrThrow(inviteCode: string): Promise<DecodedResult> {
    const decoded = this.decodeInviteOrThrow(inviteCode);

    const workspaceInvite = await this.findPendingInvite(
      decoded.workspaceCode,
      decoded.codeInInvite,
      decoded.recipientEmail,
    );

    if (isEmpty(workspaceInvite)) {
      this.logger.warn('Cannot find invite for teammate');
      throw new InvalidInviteCode('Cannot verify decoded invite for teammate');
    }

    return decoded;
  }

  private async findPendingInvite(
    workspaceCode: string,
    inviteCode: string,
    email: string,
  ): Promise<WorkspaceInvite | null> {
    return this.prismaService.workspaceInvite.findFirst({
      where: {
        workspaceCode: workspaceCode,
        inviteCode: inviteCode,
        recipientEmail: email,
        status: InviteStatus.SENT,
      },
    });
  }

  async tryAcceptInviteAndRequestMagicLink(
    workspaceCode: string,
    inviteCode: string,
    teammateDetails: TeammateDetails,
  ): Promise<WorkspaceInvite> {
    const invite = await this.findPendingInvite(
      workspaceCode,
      inviteCode,
      teammateDetails.email,
    );

    if (!invite) {
      throw new InvalidInviteCode('Invalid invite code');
    }

    await this.prismaService.$transaction(async (tx) => {
      await tx.teammate.create({
        data: {
          workspaceCode: workspaceCode,
          email: teammateDetails.email,
          firstName: teammateDetails.firstName,
          lastName: teammateDetails.lastName,
          username: teammateDetails.username,
          groups: [invite.recipientRole],
        },
      });

      await tx.workspaceInvite.update({
        where: { id: invite.id },
        data: {
          status: InviteStatus.ACCEPTED,
          acceptedAt: new Date(),
        },
      });

      await this.authService.signTeammateUpAndPushMagicLink(
        invite.recipientEmail,
        invite.workspaceCode,
      );
    });
    return invite;
  }

  private decodedValue(inviteCode: string): string {
    // because of how base64 is encoded, i.e length% 3. we will never get certain lengths for encoding
    // because we only reduce length for encoding by 0,1 or 2 .
    // the encoded length has to be divisible by 4. to get that
    // (lengthOfTrimmedEncoding + X)%4 = 0 where x ∈ {0,1,2}
    switch (inviteCode.length % 4) {
      case 0:
        return Buffer.from(inviteCode, 'base64').toString('utf8');
      case 2:
        return Buffer.from(inviteCode + '==', 'base64').toString('utf8');

      case 3:
        return Buffer.from(inviteCode + '=', 'base64').toString('utf8');

      default:
        throw new InvalidInviteCode('Invalid code not valid');
    }
  }
}
