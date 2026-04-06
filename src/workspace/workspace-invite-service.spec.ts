import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@/prisma/prisma.module';
import { MessagingModule } from '@/messaging/messaging.module';
import { WorkspaceManager } from '@/workspace/workspace-manager.service';
import { WorkspaceLinkService } from '@/workspace/workspace-link.service';
import { RoleService } from '@/permission/role/role.service';
import { createTestApp } from '@/test-helpers/test-app';
import { INestApplication } from '@nestjs/common';
import {
  DecodedResult,
  WorkspaceInviteService,
} from '@/workspace/workspace-invite-service';

describe('WorkspaceInviteService', () => {
  let app: INestApplication;
  let workspaceInviteService: WorkspaceInviteService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot(),
        PrismaModule,
        MessagingModule,
        RoleService,
      ],
      providers: [WorkspaceManager, WorkspaceLinkService],
    }).compile();

    app = await createTestApp(module);
    workspaceInviteService = app.get(WorkspaceInviteService);
  });

  describe('encoding', () => {
    it('removes padding when multiple is present', () => {
      expect(
        workspaceInviteService.encodeInvite(
          'anabela.sidne@gmail.com',
          '9Jk076',
          'anal90',
        ),
      ).toBe('YW5hYmVsYS5zaWRuZUBnbWFpbC5jb20sOUprMDc2LGFuYWw5MA');
    });

    it('removes padding when only one', () => {
      expect(
        workspaceInviteService.encodeInvite(
          'anabela.sidnee@gmail.com',
          '9Jk076',
          'anal90',
        ),
      ).toBe('YW5hYmVsYS5zaWRuZWVAZ21haWwuY29tLDlKazA3NixhbmFsOTA');
    });

    it('returns result when no padding is present', () => {
      expect(
        workspaceInviteService.encodeInvite(
          'sam@gmail.com',
          '9Jk076',
          'anal90',
        ),
      ).toBe('c2FtQGdtYWlsLmNvbSw5SmswNzYsYW5hbDkw');
    });
  });

  describe('decode', () => {
    test.each([
      {
        inviteCode: 'c2FtQGdtYWlsLmNvbSw5SmswNzYsYW5hbDkw',
        decodedResult: {
          email: 'sam@gmail.com',
          workspaceCode: '9Jk076',
          salt: 'anal90',
        },
      },
      {
        inviteCode: 'c2FtQGdtYWlsLmNvbSw5SmswNzYsYW5hbDkw',
        decodedResult: {
          email: 'sam@gmail.com',
          workspaceCode: '9Jk076',
          salt: 'anal90',
        },
      },
      {
        inviteCode: 'c2FtQGdtYWlsLmNvbSw5SmswNzYsYW5hbDkw',
        decodedResult: {
          email: 'sam@gmail.com',
          workspaceCode: '9Jk076',
          salt: 'anal90',
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
        expect(workspaceInviteService.decodeInvite(inviteCode)).toEqual(
          decodedResult,
        );
      },
    );
  });
});
