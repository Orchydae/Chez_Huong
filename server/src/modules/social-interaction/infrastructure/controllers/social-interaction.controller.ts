import { Controller, Post, Get, Delete, Param, Body, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { SocialInteractionService } from '../../application/services/social-interaction.service';
import { AddCommentDto } from './dtos/add-comment.dto';

@Controller()
export class SocialInteractionController {
    constructor(private readonly socialInteractionService: SocialInteractionService) { }

    // ==================== LIKE ENDPOINTS ====================

    /**
     * Toggle like on a recipe (like if not liked, unlike if already liked)
     */
    @UseGuards(JwtAuthGuard)
    @Post('recipes/:id/like')
    async toggleLike(@Param('id') recipeId: string, @Request() req) {
        return this.socialInteractionService.toggleLike(req.user.userId, +recipeId);
    }

    /**
     * Get like count for a recipe
     */
    @Get('recipes/:id/likes')
    async getLikeCount(@Param('id') recipeId: string) {
        return this.socialInteractionService.getLikeCount(+recipeId);
    }

    // ==================== COMMENT ENDPOINTS ====================

    /**
     * Add a top-level comment to a recipe
     */
    @UseGuards(JwtAuthGuard)
    @Post('recipes/:id/comments')
    async addComment(
        @Param('id') recipeId: string,
        @Body() dto: AddCommentDto,
        @Request() req
    ) {
        return this.socialInteractionService.addComment(req.user.userId, +recipeId, dto.content);
    }

    /**
     * Get all comments for a recipe (with nested replies)
     */
    @Get('recipes/:id/comments')
    async getComments(@Param('id') recipeId: string) {
        return this.socialInteractionService.getCommentsByRecipe(+recipeId);
    }

    /**
     * Reply to an existing comment
     */
    @UseGuards(JwtAuthGuard)
    @Post('comments/:id/reply')
    async replyToComment(
        @Param('id') commentId: string,
        @Body() dto: AddCommentDto,
        @Request() req
    ) {
        return this.socialInteractionService.replyToComment(req.user.userId, +commentId, dto.content);
    }

    /**
     * Delete own comment (cascades to replies)
     */
    @UseGuards(JwtAuthGuard)
    @Delete('comments/:id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteComment(@Param('id') commentId: string, @Request() req) {
        await this.socialInteractionService.deleteComment(+commentId, req.user.userId);
    }
}
