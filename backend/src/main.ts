import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, type OpenAPIObject } from '@nestjs/swagger';
import type { Express } from 'express';
import { openApiDocument } from './openapi';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  process.env.TZ = 'America/Recife';

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    methods: 'GET, HEAD, PUT, PATCH, POST, DELETE, OPTIONS',
    credentials: true,
  });

  app.setGlobalPrefix('api/v1');

  const server = app.getHttpAdapter().getInstance() as Express;
  server.get('/openapi.json', (_request, response) =>
    response.json(openApiDocument),
  );
  SwaggerModule.setup('docs', app, openApiDocument as OpenAPIObject, {
    jsonDocumentUrl: '/openapi.json',
  });

  const port = Number(process.env.PORT ?? 4000);
  const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1';
  await app.listen(port, host);
}
void bootstrap();
