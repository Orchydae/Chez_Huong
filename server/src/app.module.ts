import { Module } from '@nestjs/common';
import { UsersModule } from './modules/users/users.module';
import { RecipesModule } from './modules/recipes/recipes.module';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { TranslationModule } from './modules/translation/translation.module';
import { SocialInteractionModule } from './modules/social-interaction/social-interaction.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    UsersModule,
    RecipesModule,
    TranslationModule,
    SocialInteractionModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule { }
