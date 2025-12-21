import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupApp } from './app.setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  setupApp(app);
  await app.listen(process.env.PORT ?? 3001);
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
