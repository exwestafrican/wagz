import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupApp(app: INestApplication) {
  const configService = app.get(ConfigService);
  const isProduction = configService.get<string>('NODE_ENV') === 'production';
  const enableSwagger = !isProduction;

  // Only setup Swagger in development
  if (enableSwagger) {
    const config = new DocumentBuilder() //Setup Swagger config
      .setTitle('Envoye API')
      .setDescription('All endpoints for the Envoye API')
      .setVersion('1.0')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
  }

  app.useGlobalPipes(new ValidationPipe()); //enable validation globally
}
