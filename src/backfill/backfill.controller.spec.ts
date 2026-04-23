import { TestingModule } from '@nestjs/testing';
import { BackfillController } from './backfill.controller';
import {
  createTestApp,
  TestControllerModuleWithAuthUser,
} from '@/test-helpers/test-app';
import RequestUser from '@/auth/domain/request-user';
import { BackfillRegistryProvider } from '@/backfill/backfill-registry.provider';
import getHttpServer from '@/test-helpers/get-http-server';
import { HttpStatus, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { URIPaths } from '@/common/const';
import BackfillResponseDto from '@/backfill/dto/backfill-response.dto';

describe('BackfillController', () => {
  let controller: BackfillController;
  let requestUser: RequestUser;
  let app: INestApplication;

  beforeEach(async () => {
    requestUser = RequestUser.of('sam@useEnvoye.co');
    const module: TestingModule = await TestControllerModuleWithAuthUser({
      controllers: [BackfillController],
      providers: [BackfillRegistryProvider],
    }).with(requestUser);

    controller = module.get<BackfillController>(BackfillController);
    app = await createTestApp(module);
  });

  describe('list', () => {
    it('should return a list of backfill jobs', async () => {
      const response = await request(getHttpServer(app))
        .get(URIPaths.LIST_TASKS)
        .set('Accept', 'application/json')
        .set('Authorization', 'Bearer test-token')
        .send()
        .expect(HttpStatus.OK);
      const body = response.body as BackfillResponseDto[];
      expect(body.length).toBe(1);
    });
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
