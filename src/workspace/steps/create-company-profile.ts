import { PreVerification } from '@prisma/client';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Step } from '@/workspace/steps/step';
import { CompanyProfile } from '@/generated/prisma/client';

@Injectable()
export class CreateWorkspaceProfileStep implements Step<CompanyProfile> {
  logger = new Logger(CreateWorkspaceProfileStep.name);
  constructor(private readonly prismaService: PrismaService) {}

  async take(preVerification: PreVerification): Promise<CompanyProfile> {
    const profile = await this.prismaService.companyProfile.create({
      data: {
        companyName: preVerification.companyName,
        pointOfContactEmail: preVerification.email,
        phoneCountryCode: preVerification.phoneCountryCode,
        phoneNumber: preVerification.phoneNumber,
      },
    });
    this.logger.log(
      `Successfully created profile for company companyName=${preVerification.companyName} profileId=${profile.id}`,
    );
    return profile;
  }
}
