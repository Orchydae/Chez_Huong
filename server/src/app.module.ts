import { Module } from '@nestjs/common';
import { UsersModule } from './modules/users/users.module';
import { RecipesModule } from './modules/recipes/recipes.module';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    UsersModule,
    RecipesModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule { }
