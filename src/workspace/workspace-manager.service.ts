import { Injectable } from '@nestjs/common';
import { PreVerification } from '@/generated/prisma/client';

@Injectable()
export class WorkspaceManager {
  setup(details: PreVerification) {}
}
