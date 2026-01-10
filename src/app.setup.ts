import {
  BadRequestException,
  INestApplication,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupApp(app: INestApplication) {
  const configService = app.get(ConfigService);
  const isProduction = configService.get<string>('NODE_ENV') === 'production';
  const enableSwagger = !isProduction;

  app.enableCors({
    origin: '*', //TODO: change this to specific (move to env)
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
