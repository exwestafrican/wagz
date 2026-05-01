import { FeatureFlagController } from './feature-flag.controller';
import { HttpStatus, INestApplication } from '@nestjs/common';
import {
  createTestApp,
  TestControllerModuleWithAuthUser,
} from '@/test-helpers/test-app';
import getHttpServer from '@/test-helpers/get-http-server';
import request from 'supertest';
import RequestUser from '@/auth/domain/request-user';
import { ENVOYE_WORKSPACE_CODE } from './const';
import FeatureFlagManager from '@/feature-flag/manager';
import { PrismaService } from '@/prisma/prisma.service';
import { setupWorkspaceWithFeatures } from '@/test-helpers/workspace-helpers';

describe('FeatureFlagController', () => {
  let requestUser: RequestUser;
  let app: INestApplication;
  let prismaService: PrismaService;

  beforeEach(async () => {
    requestUser = RequestUser.of('laura@useEnvoye.co');
    const module = await TestControllerModuleWithAuthUser({
      controllers: [FeatureFlagController],
      providers: [FeatureFlagManager],
    }).with(requestUser);

    app = await createTestApp(module);
    prismaService = app.get<PrismaService>(PrismaService);
  });

  afterEach(async () => {
    await prismaService.workspaceFeature.deleteMany();
    await prismaService.featureFlag.deleteMany();
    await prismaService.companyProfile.deleteMany();
    await app.close();
  });

  it('should return list of enabled features for envoye workspace', async () => {
    await setupWorkspaceWithFeatures(app, ENVOYE_WORKSPACE_CODE, [
      'can_integrate_whatsapp',
      'can_integrate_instagram',
      'can_integrate_gmail',
    ]);
    const response = await request(getHttpServer(app))
      .get('/feature-flags/enabled')
      .query({ workspaceCode: ENVOYE_WORKSPACE_CODE })
      .set('Authorization', 'Bearer test-token')
      .expect(HttpStatus.OK);

    expect(response.body).toEqual([
      'can_integrate_whatsapp',
      'can_integrate_instagram',
      'can_integrate_gmail',
    ]);
  });

  it('should return empty array for workspace with no enabled feature', async () => {
    const response = await request(getHttpServer(app))
      .get('/feature-flags/enabled')
      .query({ workspaceCode: '13se4e' })
      .set('Authorization', 'Bearer test-token')
      .expect(HttpStatus.OK);

    expect(response.body).toEqual([]);
  });
});
