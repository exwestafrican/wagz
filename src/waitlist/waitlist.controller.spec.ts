import { Test, TestingModule } from '@nestjs/testing';
import { WaitlistController } from './waitlist.controller';
import { WaitlistService } from '@/waitlist/waitlist.service';
import { FeaturesService } from '@/roadmap/service/feature.service';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@/prisma/prisma.module';
import request from 'supertest';
import getHttpServer from '@/test-helpers/get-http-server';
import { INestApplication } from '@nestjs/common';
import { createTestApp } from '@/test-helpers/test-app';
import { WaitListEndpoints } from '@/waitlist/consts';

describe('WaitlistController', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot(), PrismaModule],
      controllers: [WaitlistController],
      providers: [WaitlistService, FeaturesService],
    }).compile();

    app = await createTestApp(module);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('join waitlist', () => {
    it('should create subscription for user', async () => {});

    it(' does not allow bad domain to join waitlist', async () => {
      await request(getHttpServer(app))
        .post(WaitListEndpoints.JOIN)
        .send({ email: 'damilola@10minutemail.com' })
        .set('Accept', 'application/json')
        .expect(400);
    });
  });
});
