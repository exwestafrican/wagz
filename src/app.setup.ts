import {
  BadRequestException,
  INestApplication,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { Express } from 'express';

export const ALLOWED_ORIGINS = [
  'https://www.envoye.co',
  'https://www.fahari.io',
  'http://localhost:3000',
  'http://envoye.localhost:3000',
  'http://fahari.localhost:3000',
];

export function setupApp(app: INestApplication) {
  const configService = app.get(ConfigService);
  const isProduction = configService.get<string>('NODE_ENV') === 'production';
  const enableSwagger = !isProduction;

  // nginx sits in front of the app on the private Docker network. Trusting only private
  // addresses makes req.ip the visitor's address (for rate limiting) without letting a
  // caller on the public internet pick their own address via X-Forwarded-For.
  const server = app.getHttpAdapter().getInstance() as Express;
  server.set('trust proxy', 'loopback, linklocal, uniquelocal');

  app.enableCors({
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // Only setup Swagger in development
  if (enableSwagger) {
    const config = new DocumentBuilder() //Setup Swagger config
      .setTitle('Envoye API')
      .setDescription('All endpoints for the Envoye API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties that don't have decorators
      forbidNonWhitelisted: true, // Throw error if non-whitelisted properties are present
      transform: true, // Automatically transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true, // Enable implicit type conversion
      },
      exceptionFactory(errors: ValidationError[]) {
        return new BadRequestException({
          statusCode: 400,
          error: 'Bad Request',

          message: errors.flatMap(
            (e: ValidationError) =>
              e.constraints && Object.values(e.constraints),
          ),
          property: errors.map((e: ValidationError) => e.property),
        });
      },
    }),
  ); //enable validation globally
}
