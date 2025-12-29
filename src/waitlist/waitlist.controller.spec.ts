import { Test, TestingModule } from '@nestjs/testing';
import { WaitlistService } from '@/waitlist/waitlist.service';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@/prisma/prisma.module';
import request from 'supertest';
import getHttpServer from '@/test-helpers/get-http-server';
import { INestApplication } from '@nestjs/common';
import { createTestApp } from '@/test-helpers/test-app';
import { WaitListEndpoints } from '@/waitlist/consts';
import featureFactory from '@/factories/roadmap/features.factory';
import { MAIN_FEATURE } from '@/roadmap/consts';
import { PrismaService } from '@/prisma/prisma.service';
import { WaitlistModule } from '@/waitlist/waitlist.module';

describe('WaitlistController', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let waitlistService: WaitlistService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot(), PrismaModule, WaitlistModule],
    }).compile();

    app = await createTestApp(module);
    prismaService = app.get(PrismaService);
    waitlistService = app.get(WaitlistService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('join waitlist', () => {

    beforeAll(async () => {
      await prismaService.feature.create({
        data: featureFactory.build({ name: MAIN_FEATURE }),
      });
    });


    it('should create subscription for user', async () => {
      const waitlistUserEmail = 'akoduba@gmail.com';

      const waitlistUsers = await prismaService.featureSubscription.count();

      expect(waitlistUsers).toBe(0);

      await waitlistService.join(waitlistUserEmail);
      const updatedWaitlistUsers =
        await prismaService.featureSubscription.count();

      expect(updatedWaitlistUsers).toBe(1);
    });

    it(' does not allow bad domain to join waitlist', async () => {
      await request(getHttpServer(app))
        .post(WaitListEndpoints.JOIN)
        .send({ email: 'damilola@10minutemail.com' })
        .set('Accept', 'application/json')
        .expect(400);
    });

    it("should return 201 if user is already on waitlist", async () => {
      const waitlistUserEmail = 'dami@gmail.com';
      await waitlistService.join(waitlistUserEmail);
      await request(getHttpServer(app))
        .post(WaitListEndpoints.JOIN)
        .send({ email: waitlistUserEmail })
        .set('Accept', 'application/json')
        .expect(201);

    });
  });
});
