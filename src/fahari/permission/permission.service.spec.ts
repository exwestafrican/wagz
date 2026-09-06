import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, INestApplication } from '@nestjs/common';
import { faker } from '@faker-js/faker';

import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';
import { createTestApp } from '@/test-helpers/test-app';
import { resetDb } from '@/test-helpers/rest-db';
import RequestUser from '@/auth/domain/request-user';
import { FahariPermissionService } from '@/fahari/permission/permission.service';

describe('FahariPermissionService', () => {
  let service: FahariPermissionService;
  let app: INestApplication;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [FahariPermissionService],
    }).compile();
    app = await createTestApp(module);
    service = app.get(FahariPermissionService);
    prismaService = app.get(PrismaService);
  });

  afterEach(async () => {
    await resetDb(prismaService);
    await app.close();
  });

  describe('runIfSuperAdmin', () => {
    it('returns authorizedAction result when the user is a super admin', async () => {
      const tumise = await prismaService.user.create({
        data: {
          email: faker.internet.email().toLowerCase(),
          firstname: 'Tumise',
          lastname: 'Adekoya',
          isSuperAdmin: true,
        },
      });

      const grantedUserId = await service.runIfSuperAdmin(
        RequestUser.of(tumise.email),
        (user) => user.id,
      );

      expect(grantedUserId).toBe(tumise.id);
    });

    it('throws ForbiddenException when the user is not a super admin', async () => {
      const kemi = await prismaService.user.create({
        data: {
          email: faker.internet.email().toLowerCase(),
          firstname: 'Kemi',
          lastname: 'Ade',
          isSuperAdmin: false,
        },
      });

      await expect(
        service.runIfSuperAdmin(
          RequestUser.of(kemi.email),
          () => 'should not run',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when the user does not exist', async () => {
      await expect(
        service.runIfSuperAdmin(
          RequestUser.of(faker.internet.email().toLowerCase()),
          () => 'should not run',
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
