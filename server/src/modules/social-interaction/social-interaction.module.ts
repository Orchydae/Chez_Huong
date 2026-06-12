import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { RecipesModule } from '../recipes/recipes.module';
import { SocialInteractionController } from './social-interaction.controller';
import { SocialInteractionService } from './social-interaction.service';

@Module({
    imports: [PrismaModule, RecipesModule],
    controllers: [SocialInteractionController],
    providers: [SocialInteractionService],
})
export class SocialInteractionModule { }
