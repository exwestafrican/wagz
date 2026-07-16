import { PrismaModule } from '@/prisma/prisma.module';
import Factory, { PersistStrategy } from '@/factories/factory';
import { PrismaService } from '@/prisma/prisma.service';
import {
  ForbiddenException,
  INestApplication,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { createTestApp } from '@/test-helpers/test-app';
import { PermissionService } from '@/permission/permission.service';
import { RoleService } from '@/permission/role/role.service';
import { ImpersonationService } from '@/impersonation/impersonation.service';
import {
  setupSuperAdmin,
  setupWorkspaceWithTeammate,
} from '@/test-helpers/workspace-helpers';
import teammateFactory from '@/factories/teammate.factory';
import { ROLES } from '@/permission/types';
import { resetDb } from '@/test-helpers/rest-db';
import { Test, TestingModule } from '@nestjs/testing';
import { TeammateStatus } from '@/generated/prisma/enums';
import { IMPERSONATION_SESSION_TTL_MS } from '@/impersonation/consts';

describe('ImpersonationService', () => {
  let service: ImpersonationService;
  let prismaService: PrismaService;
  let factory: PersistStrategy;
  let app: INestApplication;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [PermissionService, RoleService, ImpersonationService],
    }).compile();
    app = await createTestApp(module);
    prismaService = app.get<PrismaService>(PrismaService);
    factory = Factory.createStrategy(prismaService);
    const roleService = app.get<RoleService>(RoleService);
    const permissionService = new PermissionService(prismaService, roleService);
    service = new ImpersonationService(prismaService, permissionService);
  });

  afterEach(async () => {
    await resetDb(prismaService);
    await app.close();
  });

  it('allows SuperAdmin to start a session for an active teammate in a customer workspace', async () => {
    const actorEmail = 'admin@useEnvoye.co';
    await setupSuperAdmin(factory, actorEmail);
    const { teammate: subjectTeammate } = await setupWorkspaceWithTeammate(
      factory,
      teammateFactory.build({ status: TeammateStatus.ACTIVE }),
    );

    const { session, subjectTeammate: resolvedSubject } =
      await service.startSession(actorEmail, subjectTeammate.id);

    expect(session.actorEmail).toBe(actorEmail);
    expect(session.subjectTeammateId).toBe(subjectTeammate.id);
    expect(session.workspaceCode).toBe(subjectTeammate.workspaceCode);
    expect(resolvedSubject.email).toBe(subjectTeammate.email);
  });

  it('forbids non-SuperAdmin from starting a session', async () => {
    const actorEmail = 'support@useEnvoye.co';
    await setupWorkspaceWithTeammate(
      factory,
      teammateFactory.build({
        email: actorEmail,
        groups: [ROLES.SupportStaff.code],
      }),
    );
    const { teammate: subjectTeammate } = await setupWorkspaceWithTeammate(
      factory,
      teammateFactory.build(),
    );

    await expect(
      service.startSession(actorEmail, subjectTeammate.id),
    ).rejects.toThrow(ForbiddenException);
  });

  it('forbids impersonating self', async () => {
    const actorEmail = 'admin@useEnvoye.co';
    const { teammate: actorTeammate } = await setupSuperAdmin(
      factory,
      actorEmail,
    );
    const { teammate: subjectTeammate } = await setupWorkspaceWithTeammate(
      factory,
      teammateFactory.build({ email: actorEmail }),
    );

    await expect(
      service.startSession(actorEmail, subjectTeammate.id),
    ).rejects.toThrow(ForbiddenException);
    expect(actorTeammate.email).toBe(actorEmail);
  });

  it('rejects expired sessions in resolveSession', async () => {
    const actorEmail = 'admin@useEnvoye.co';
    await setupSuperAdmin(factory, actorEmail);
    const { teammate: subjectTeammate } = await setupWorkspaceWithTeammate(
      factory,
      teammateFactory.build(),
    );

    const { session } = await service.startSession(
      actorEmail,
      subjectTeammate.id,
    );

    await prismaService.impersonationSession.update({
      where: { id: session.id },
      data: {
        expiresAt: new Date(Date.now() - IMPERSONATION_SESSION_TTL_MS),
      },
    });

    await expect(
      service.resolveSession(session.id, actorEmail),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects ended sessions in resolveSession', async () => {
    const actorEmail = 'admin@useEnvoye.co';
    await setupSuperAdmin(factory, actorEmail);
    const { teammate: subjectTeammate } = await setupWorkspaceWithTeammate(
      factory,
      teammateFactory.build(),
    );

    const { session } = await service.startSession(
      actorEmail,
      subjectTeammate.id,
    );
    await service.endSession(actorEmail, session.id);

    await expect(
      service.resolveSession(session.id, actorEmail),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('ends the previous active session when starting a new one', async () => {
    const actorEmail = 'admin@useEnvoye.co';
    await setupSuperAdmin(factory, actorEmail);
    const { teammate: firstSubject } = await setupWorkspaceWithTeammate(
      factory,
      teammateFactory.build(),
    );
    const { teammate: secondSubject } = await setupWorkspaceWithTeammate(
      factory,
      teammateFactory.build(),
    );

    const { session: firstSession } = await service.startSession(
      actorEmail,
      firstSubject.id,
    );
    const { session: secondSession } = await service.startSession(
      actorEmail,
      secondSubject.id,
    );

    const endedFirstSession =
      await prismaService.impersonationSession.findUniqueOrThrow({
        where: { id: firstSession.id },
      });

    expect(endedFirstSession.endedAt).not.toBeNull();
    expect(secondSession.endedAt).toBeNull();
  });

  it('throws NotFoundException when subject teammate does not exist', async () => {
    const actorEmail = 'admin@useEnvoye.co';
    await setupSuperAdmin(factory, actorEmail);

    await expect(service.startSession(actorEmail, 99999)).rejects.toThrow(
      NotFoundException,
    );
  });
});
