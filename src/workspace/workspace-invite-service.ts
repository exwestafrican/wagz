import { Injectable, Logger } from '@nestjs/common';
import { InvalidInviteCode } from '@/common/exceptions/invalid-code';
import { PrismaService } from '@/prisma/prisma.service';
import { isEmpty } from '@/common/utils';
import { InviteStatus } from '@/generated/prisma/enums';

export interface TeammateDetails {
  firstName: string;
  lastName: string;
  email: string;
}

export interface DecodedResult {
  recipientEmail: string;
  workspaceCode: string;
  codeInInvite: string;
}

@Injectable()
export class WorkspaceInviteService {
  logger = new Logger(WorkspaceInviteService.name);

  constructor(private readonly prismaService: PrismaService) {}

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

    const workspaceInvite = await this.prismaService.workspaceInvite.findFirst({
      where: {
        inviteCode: decoded.codeInInvite,
        workspaceCode: decoded.workspaceCode,
        recipientEmail: decoded.recipientEmail,
        status: InviteStatus.SENT,
      },
    });

    if (isEmpty(workspaceInvite)) {
      throw new InvalidInviteCode('Cannot verify decoded invite for teammate');
    }

    return decoded;
  }

  async acceptInvite(input: {
    workspaceCode: string;
    inviteCode: string;
    teammateDetails: TeammateDetails;
  }): Promise<void> {
    const invite = await this.prismaService.workspaceInvite.findFirst({
      where: {
        workspaceCode: input.workspaceCode,
        inviteCode: input.inviteCode,
        recipientEmail: input.teammateDetails.email,
        status: InviteStatus.SENT,
      },
    });

    if (!invite) {
      throw new InvalidInviteCode('Invalid invite code');
    }

    await this.prismaService.$transaction(async (tx) => {
      await tx.teammate.create({
        data: {
          workspaceCode: input.workspaceCode,
          email: input.teammateDetails.email,
          firstName: input.teammateDetails.firstName,
          lastName: input.teammateDetails.lastName,
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
    });
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
