import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@/prisma/prisma.module';
import { MessagingModule } from '@/messaging/messaging.module';
import { WorkspaceManager } from '@/workspace/workspace-manager.service';
import { WorkspaceLinkService } from '@/workspace/workspace-link.service';
import { RoleService } from '@/permission/role/role.service';
import { createTestApp } from '@/test-helpers/test-app';
import {
  DecodedResult,
  WorkspaceInviteService,
} from '@/workspace/workspace-invite-service';
import { InvalidInviteCode } from '@/common/exceptions/invalid-code';
import { INestApplication } from '@nestjs/common';
import { InviteStatus } from '@/generated/prisma/enums';
import { setupWorkspaceWithTeammate } from '@/test-helpers/workspace-helpers';
import teammateFactory from '@/factories/teammate.factory';
import workspaceInviteFactory from '@/factories/workspace-invite.factory';
import Factory, { PersistStrategy } from '@/factories/factory';
import { PrismaService } from '@/prisma/prisma.service';
import { resetDb } from '@/test-helpers/rest-db';

describe('WorkspaceInviteService', () => {
  let app: INestApplication;
  let workspaceInviteService: WorkspaceInviteService;
  let factory: PersistStrategy;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot(), PrismaModule, MessagingModule],
      providers: [
        WorkspaceManager,
        WorkspaceLinkService,
        RoleService,
        WorkspaceInviteService,
      ],
    }).compile();

    app = await createTestApp(module);
    prismaService = app.get<PrismaService>(PrismaService);
    workspaceInviteService = app.get<WorkspaceInviteService>(
      WorkspaceInviteService,
    );
    factory = Factory.createStrategy(prismaService);
  });


  afterEach(async () => {
    await resetDb(prismaService);
    await app.close();
  });

  describe('encoding', () => {
    it('encodes and can decode back', () => {
      const inviteCode = workspaceInviteService.encodeInvite(
        'anabela.sidne@gmail.com',
        '9Jk076',
        'anal90',
      );
      expect(inviteCode).not.toContain('=');
      expect(workspaceInviteService.decodeInviteOrThrow(inviteCode)).toEqual({
        recipientEmail: 'anabela.sidne@gmail.com',
        workspaceCode: '9Jk076',
        codeInInvite: 'anal90',
      });
    });
  });

  describe('decode', () => {
    test.each([
      {
        inviteCode: 'c2FtQGdtYWlsLmNvbSw5SmswNzYsYW5hbDkw', // legacy (unpadded) base64
        decodedResult: {
          recipientEmail: 'sam@gmail.com',
          workspaceCode: '9Jk076',
          codeInInvite: 'anal90',
        },
      },
    ])(
      'it decodes correctly inviteCode: $inviteCode',
      ({
        inviteCode,
        decodedResult,
      }: {
        inviteCode: string;
        decodedResult: DecodedResult;
      }) => {
        expect(workspaceInviteService.decodeInviteOrThrow(inviteCode)).toEqual(
          decodedResult,
        );
      },
    );

    test('it throws exception when invite code is invalid', () => {
      expect(() => {
        workspaceInviteService.decodeInviteOrThrow(
          'c2FtQGdtYWlsLmNvbSw5SmswNzYsYW5hbDkw=',
        );
      }).toThrow(InvalidInviteCode);
    });
  });

  describe('decodeAndVerifyOrThrow', () => {
    it('throws InvalidInviteCode when no DB match', async () => {
      const token = workspaceInviteService.encodeInvite(
        'a@b.com',
        'W123',
        'dbInviteCode',
      );
      await expect(
        workspaceInviteService.decodeAndVerifyOrThrow(token),
      ).rejects.toThrow(InvalidInviteCode);
    });

    test.each([
      InviteStatus.ACCEPTED,
      InviteStatus.PENDING,
      InviteStatus.FAILED,
    ])('it should fail for invalid status %s', async (status: InviteStatus) => {
      const { teammate } = await setupWorkspaceWithTeammate(
        factory,
        teammateFactory.build({
          email: 'admin@useenvoye.com',
          groups: ['WorkspaceAdmin'],
          workspaceCode: '9Jk076',
        }),
      );

      await factory.persist('workspaceInvite', () =>
        workspaceInviteFactory.build({
          recipientEmail: 'laura@useenvoye.co',
          senderId: teammate.id,
          workspaceCode: '9Jk076',
          inviteCode: 'ap7ol0',
          status: status,
        }),
      );

      const token = workspaceInviteService.encodeInvite(
        'laura@useenvoye.co',
        '9Jk076',
        'ap7ol0',
      );
      await expect(
        workspaceInviteService.decodeAndVerifyOrThrow(token),
      ).rejects.toThrow(InvalidInviteCode);
    });
  });
});
