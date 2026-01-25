import { Step } from '@/workspace/steps/step';
import { Workspace } from '@/generated/prisma/client';
import { Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { PreVerification } from '@prisma/client';

export class CreateWorkspaceStep implements Step<Workspace> {
  logger = new Logger(CreateWorkspaceStep.name);
  constructor(private readonly prismaService: PrismaService) {}

  take(preVerification: PreVerification): Promise<Workspace> {
    //TODO look for company where workspaceName = companhy Name ?
    const company = this.prismaService.companyProfile.findMany({
      where: {
        companyName: preVerification.companyName,
        pointOfContactEmail: preVerification.email
      }
    });
    return this.prismaService.workspace.create({
      data: {
        name: preVerification.companyName,
        ownedById: 1, // the company,
        code: 'sd', // we need to auto generate code
      },
    });
  }
}
