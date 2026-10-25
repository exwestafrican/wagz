import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupApp } from './app.setup';
import TaskManager from '@/scheduler/task-manager';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  setupApp(app);
  app.enableShutdownHooks(); // listen for shut down and call onModuleDestroy
  await app.listen(process.env.PORT ?? 3001);
  // start up Tasks
  app.get(TaskManager).start();
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
