import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Request,
    UseGuards,
} from '@nestjs/common';
import { SocialInteractionService } from './social-interaction.service';
import { AddCommentDto } from './dtos/add-comment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';

interface AuthedRequest {
    user: { userId: string; email: string; role: string };
}

// Reads use OptionalJwtAuthGuard so draft authors/admins still see their own
// counts; for everyone else a hidden draft answers 404 (see the service).
interface OptionalAuthedRequest {
    user?: { userId: string; email: string; role: string };
}

@Controller()
export class SocialInteractionController {
    constructor(private readonly social: SocialInteractionService) { }

    // ─── Likes ────────────────────────────────────────────────────────

    @Post('recipes/:id/like')
    @UseGuards(JwtAuthGuard)
    toggleLike(@Param('id', ParseIntPipe) recipeId: number, @Request() req: AuthedRequest) {
        return this.social.toggleLike(req.user.userId, req.user.role, recipeId);
    }

    @Get('recipes/:id/likes')
    @UseGuards(OptionalJwtAuthGuard)
    getLikeCount(
        @Param('id', ParseIntPipe) recipeId: number,
        @Request() req: OptionalAuthedRequest,
    ) {
        return this.social.getLikeCount(recipeId, req.user);
    }

    // ─── Comments ─────────────────────────────────────────────────────

    @Post('recipes/:id/comments')
    @UseGuards(JwtAuthGuard)
    addComment(
        @Param('id', ParseIntPipe) recipeId: number,
        @Body() dto: AddCommentDto,
        @Request() req: AuthedRequest,
    ) {
        return this.social.addComment(req.user.userId, req.user.role, recipeId, dto.content);
    }

    @Get('recipes/:id/comments')
    @UseGuards(OptionalJwtAuthGuard)
    getComments(
        @Param('id', ParseIntPipe) recipeId: number,
        @Request() req: OptionalAuthedRequest,
    ) {
        return this.social.getCommentsByRecipe(recipeId, req.user);
    }

    @Post('comments/:id/reply')
    @UseGuards(JwtAuthGuard)
    replyToComment(
        @Param('id', ParseIntPipe) commentId: number,
        @Body() dto: AddCommentDto,
        @Request() req: AuthedRequest,
    ) {
        return this.social.replyToComment(req.user.userId, req.user.role, commentId, dto.content);
    }

    /** The deeper subtree under one comment — backs "load more replies" (M5). Draft-aware. */
    @Get('comments/:id/replies')
    @UseGuards(OptionalJwtAuthGuard)
    getReplies(
        @Param('id', ParseIntPipe) commentId: number,
        @Request() req: OptionalAuthedRequest,
    ) {
        return this.social.getReplies(commentId, req.user);
    }

    /** Edit your own comment (M5). The DTO is the same validated shape as adding one. */
    @Patch('comments/:id')
    @UseGuards(JwtAuthGuard)
    editComment(
        @Param('id', ParseIntPipe) commentId: number,
        @Body() dto: AddCommentDto,
        @Request() req: AuthedRequest,
    ) {
        return this.social.editComment(commentId, req.user.userId, dto.content);
    }

    @Delete('comments/:id')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteComment(
        @Param('id', ParseIntPipe) commentId: number,
        @Request() req: AuthedRequest,
    ) {
        await this.social.deleteComment(commentId, req.user.userId);
    }
}
