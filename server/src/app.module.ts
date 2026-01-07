import { Module } from '@nestjs/common';
import { UsersModule } from './modules/users/users.module';
import { RecipesModule } from './modules/recipes/recipes.module';

@Module({
  imports: [UsersModule, RecipesModule],
  controllers: [],
  providers: [],
})
export class AppModule { }
