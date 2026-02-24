import { FeatureFlagController } from './feature-flag.controller';
import { FeatureFlagService } from './feature-flag.service';
import { HttpStatus, INestApplication } from '@nestjs/common';
import {
  createTestApp,
  TestControllerModuleWithAuthUser,
} from '@/test-helpers/test-app';
import getHttpServer from '@/test-helpers/get-http-server';
import request from 'supertest';
import RequestUser from '@/auth/domain/request-user';
import { ENVOYE_WORKSPACE_CODE, FEATURE_FLAG_LOADER } from './const';
import { TestFeatureFlagLoader } from './service/test-feature-flag-loader';

describe('FeatureFlagController', () => {
  let requestUser: RequestUser;
  let app: INestApplication;

  beforeEach(async () => {
    requestUser = RequestUser.of('laura@useEnvoye.co');
    const module = await TestControllerModuleWithAuthUser({
      controllers: [FeatureFlagController],
      providers: [
        FeatureFlagService,
        { provide: FEATURE_FLAG_LOADER, useClass: TestFeatureFlagLoader },
      ],
    }).with(requestUser);

    app = await createTestApp(module);
  });

  afterEach(async () => {
    await app.close();
  });

  it('should return list of enabled features for envoye workspace', async () => {
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
