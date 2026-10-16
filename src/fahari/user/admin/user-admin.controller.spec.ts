import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { INestApplication, NotFoundException } from '@nestjs/common';

import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';
import { createTestApp } from '@/test-helpers/test-app';
import { resetDb } from '@/test-helpers/rest-db';
import RequestUser from '@/auth/domain/request-user';
import { UserService } from '@/fahari/user/user.service';
import { UserAdminController } from '@/fahari/user/admin/user-admin.controller';
import { FahariPermissionService } from '@/fahari/permission/permission.service';
import Factory, { PersistStrategy } from '@/factories/factory';
import userFactory from '@/factories/fahari/user.factory';

describe('UserAdminController', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let factory: PersistStrategy;
  let adminController: UserAdminController;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot(), PrismaModule],
      providers: [],
    }).compile();

    app = await createTestApp(module);
    prismaService = app.get(PrismaService);
    factory = Factory.createStrategy(prismaService);
    adminController = new UserAdminController(
      new UserService(prismaService),
      new FahariPermissionService(prismaService),
    );
  });

  afterEach(async () => {
    await resetDb(prismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('listChauffeurs', () => {
    it('returns non-super-admin users for a super admin', async () => {
      const tumise = await factory.persist('user', () =>
        userFactory.superAdmin(),
      );
      const ada = await factory.persist('user', () =>
        userFactory.build({ firstname: 'ada', lastname: 'okafor' }),
      );
      const kemi = await factory.persist('user', () =>
        userFactory.build({ firstname: 'kemi', lastname: 'adeyemi' }),
      );
      await factory.persist('user', () => userFactory.superAdmin());

      const chauffeurs = await adminController.listChauffeurs(
        RequestUser.of(tumise.email),
      );

      expect(chauffeurs).toEqual([
        {
          userId: ada.id,
          firstName: ada.firstname,
          lastName: ada.lastname,
          email: ada.email,
        },
        {
          userId: kemi.id,
          firstName: kemi.firstname,
          lastName: kemi.lastname,
          email: kemi.email,
        },
      ]);
    });

    it('throws NotFoundException when the caller is not a super admin', async () => {
      const kemi = await factory.persist('user', () => userFactory.build());

      await expect(
        adminController.listChauffeurs(RequestUser.of(kemi.email)),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
