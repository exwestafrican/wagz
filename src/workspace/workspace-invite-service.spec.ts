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

describe('WorkspaceInviteService', () => {
  let app: INestApplication;
  let workspaceInviteService: WorkspaceInviteService;

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
    workspaceInviteService = app.get<WorkspaceInviteService>(
      WorkspaceInviteService,
    );
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
        email: 'anabela.sidne@gmail.com',
        workspaceCode: '9Jk076',
        salt: 'anal90',
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
});
