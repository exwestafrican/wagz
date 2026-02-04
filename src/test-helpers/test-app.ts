import { Test, TestingModule } from '@nestjs/testing';
import { setupApp } from '@/app.setup';
import RequestUser from '@/auth/domain/request-user';
import { ConfigModule } from '@nestjs/config';
import { JWT_VERIFIER } from '@/jwt-verifier/consts';
import { Provider } from '@nestjs/common';
import { Type } from '@nestjs/common';
import JwtVerifier from '@/jwt-verifier/jwt-verifier.interface';
import { PrismaModule } from '@/prisma/prisma.module';

export async function createTestApp(module: TestingModule) {
  const app = module.createNestApplication();
  setupApp(app);
  await app.init();
  return app;
}

function makeMockJwtVerifier(user: RequestUser): JwtVerifier {
  const mockPayload = { email: user.email };
  return {
    verifyAndDecode: jest.fn().mockResolvedValue({
      isValid: true,
      payload: mockPayload,
    }),
  };
}

export interface ModuleConfig {
  controllers: Type<unknown>[];
  providers: Provider[];
}

export function TestControllerModuleWithAuthUser(config: ModuleConfig) {
  return {
    with: async function (user: RequestUser): Promise<TestingModule> {
      return await Test.createTestingModule({
        imports: [PrismaModule, ConfigModule.forRoot()],
        controllers: [...config.controllers],
        providers: [
          ...config.providers,
          { provide: JWT_VERIFIER, useValue: makeMockJwtVerifier(user) },
        ],
      }).compile();
    },
  };
}
