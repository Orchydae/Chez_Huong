import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { UsersModule } from './modules/users/users.module';
import { RecipesModule } from './modules/recipes/recipes.module';
import { AuthModule } from './modules/auth/auth.module';
import { TranslationModule } from './modules/translation/translation.module';
import { SocialInteractionModule } from './modules/social-interaction/social-interaction.module';
import { SharedModule } from './shared/shared.module';
import { HealthModule } from './modules/health/health.module';
import { envValidationSchema } from './config/env.validation';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            validationSchema: envValidationSchema,
            validationOptions: { abortEarly: false },
        }),
        // 60 requests / minute / IP by default. Override per-route with @Throttle()
        // when needed (e.g. tighter on /auth/login, /translate).
        ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
        SharedModule,
        AuthModule,
        UsersModule,
        RecipesModule,
        TranslationModule,
        SocialInteractionModule,
        HealthModule,
    ],
    controllers: [],
    providers: [
        { provide: APP_GUARD, useClass: ThrottlerGuard },
    ],
})
export class AppModule { }
