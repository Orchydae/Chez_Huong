import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { PrismaExceptionFilter } from './shared/prisma-exception.filter';
import { validationExceptionFactory } from './shared/validation-exception.factory';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    app.setGlobalPrefix('v1');

    app.useGlobalPipes(new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        // attach dotted field paths to 400s so the client can highlight the
        // exact row/field that failed (it owns no validation rules itself)
        exceptionFactory: validationExceptionFactory,
    }));

    // One seam for Prisma errors: maps known DB errors to clean HTTP statuses
    // so services don't each wrap writes in try/catch.
    app.useGlobalFilters(new PrismaExceptionFilter());

    let clientUrl = process.env.CLIENT_URL ?? 'http://localhost:5173';
    if (clientUrl.endsWith('/')) {
        clientUrl = clientUrl.slice(0, -1);
    }

    app.enableCors({
        origin: clientUrl,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        credentials: true,
    });

    await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
