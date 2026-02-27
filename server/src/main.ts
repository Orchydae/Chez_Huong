/* eslint-disable prettier/prettier */
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable validation globally
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,           // Strip properties that don't have decorators
    forbidNonWhitelisted: true, // Throw error if non-whitelisted properties are present
    transform: true,            // Automatically transform payloads to DTO instances
  }));

  // Allow the frontend dev server to call the backend
  app.enableCors({
    origin: process.env.CLIENT_URL ?? 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
