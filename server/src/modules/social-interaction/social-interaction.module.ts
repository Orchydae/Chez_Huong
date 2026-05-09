import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { SocialInteractionController } from './infrastructure/controllers/social-interaction.controller';
import { SocialInteractionService } from './application/services/social-interaction.service';
import { LikeRecipeHandler } from './application/commands/like-recipe.handler';
import { AddCommentHandler } from './application/commands/add-comment.handler';
import { DeleteCommentHandler } from './application/commands/delete-comment.handler';
import { GetRecipeCommentsHandler } from './application/queries/get-recipe-comments.handler';
import { ISocialInteractionRepository } from './domain/ports/social-interaction.port';
import { PrismaSocialInteractionRepository } from './infrastructure/adapters/persistence/prisma.social-interaction.repository';

@Module({
    imports: [PrismaModule],
    controllers: [SocialInteractionController],
    providers: [
        SocialInteractionService,
        LikeRecipeHandler,
        AddCommentHandler,
        DeleteCommentHandler,
        GetRecipeCommentsHandler,
        {
            provide: ISocialInteractionRepository,
            useClass: PrismaSocialInteractionRepository,
        },
    ],
})
export class SocialInteractionModule { }
