import { Factory } from 'fishery';
import { WorkspaceInvite, InviteStatus } from '@/generated/prisma/client';
import { faker } from '@faker-js/faker';
import { ROLES } from '@/permission/types';
import { PrismaService } from '@/prisma/prisma.service';
import { sixCharHumanFriendlyCode } from '@/factories/code-generator';

const workspaceInviteFactory = Factory.define<WorkspaceInvite>(
  ({ sequence }) => {
    const validTill = faker.date.future();
    return {
      id: sequence,
      recipientEmail: faker.internet.email(),
      workspaceCode: sixCharHumanFriendlyCode(),
      inviteCode: sixCharHumanFriendlyCode(),
      status: InviteStatus.PENDING,
      senderId: 1,
      recipientRole: ROLES.SupportStaff.code,
      createdAt: faker.date.past(),
      validTill,
      acceptedAt: null,
    };
  },
);

export async function persistWorkspaceInvite(
  prismaService: PrismaService,
  invite: WorkspaceInvite,
) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _, ...data } = invite;
  await prismaService.workspaceInvite.create({ data });
}

export default workspaceInviteFactory;
