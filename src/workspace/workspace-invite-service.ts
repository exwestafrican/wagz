import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { InviteStatus } from '@/generated/prisma/enums';
import { InvalidInviteCode } from '@/common/exceptions/invalid-code';

export interface DecodedResult {
  email: string;
  workspaceCode: string;
  salt: string;
}

@Injectable()
export class WorkspaceInviteService {
  logger = new Logger(WorkspaceInviteService.name);

  constructor(private readonly prismaService: PrismaService) {}

  //verify
  // accept

  //When Base64 encodes:
  // If length % 3 = 1 → it adds ==
  // If length % 3 = 2 → it adds =
  // If length % 3 = 0 → no padding
  encodeInvite(email: string, workspaceCode: string, salt: string): string {
    const valueToEncode = [email, workspaceCode, salt].join(',');
    const encodedValue = btoa(valueToEncode);
    return encodedValue.replace(/=+$/, '');
  }

  decodeInviteOrThrow(inviteCode: string): DecodedResult {
    const [email, workspaceCode, salt] =
      this.decodedValue(inviteCode).split(',');
    return {
      email,
      workspaceCode,
      salt,
    };
  }

  private decodedValue(inviteCode: string): string {
    // because of how base64 is encoded, i.e length% 3. we will never get certain lengths for encoding
    // because we only reduce length for encoding by 0,1 or 2 .
    // the encoded length has to be divisible by 4. to get that
    // (lengthOfTrimmedEncoding + X)%4 = 0 where x ∈ {0,1,2}
    switch (inviteCode.length % 4) {
      case 0:
        return atob(inviteCode);

      case 2:
        return atob(inviteCode + '==');

      case 3:
        return atob(inviteCode + '=');

      default:
        throw new InvalidInviteCode('Invalid code not valid');
    }
  }

  public verifyOrThrow(inviteCode: string) {
    this.decodeInviteOrThrow(inviteCode);
  }

  async accept(inviteCode: string) {
    const teammateInvite =
      await this.prismaService.workspaceInvite.findFirstOrThrow({
        where: {
          inviteCode: inviteCode,
        },
      });

    await this.prismaService.workspaceInvite.update({
      where: { id: teammateInvite.id },
      data: { status: InviteStatus.ACCEPTED },
    });
    //InvitationDetails
    return teammateInvite;
    // if is not found in db error throw 404
    // if not found throw erropr
  }
}
