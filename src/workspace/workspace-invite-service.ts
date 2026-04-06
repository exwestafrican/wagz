import { Injectable, Logger } from '@nestjs/common';
import { InvalidInviteCode } from '@/common/exceptions/invalid-code';

export interface DecodedResult {
  email: string;
  workspaceCode: string;
  salt: string;
}

@Injectable()
export class WorkspaceInviteService {
  logger = new Logger(WorkspaceInviteService.name);

  constructor() {}

  encodeInvite(email: string, workspaceCode: string, salt: string): string {
    // remember to encodeURIComponent when using this in url
    const valueToEncode = [email, workspaceCode, salt].join(',');
    return Buffer.from(valueToEncode, 'utf8')
      .toString('base64')
      .replace(/=+$/, ''); // remove all ==
  }

  decodeInviteOrThrow(inviteCode: string): DecodedResult {
    const decoded = this.decodedValue(inviteCode);
    const [email, workspaceCode, salt] = decoded.split(',');
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

