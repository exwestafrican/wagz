import { TestingModule } from '@nestjs/testing';
import { setupApp } from '../app.setup';

export async function createTestApp(module: TestingModule) {
  const app = module.createNestApplication();
  setupApp(app);
  await app.init();
  return app;
}
