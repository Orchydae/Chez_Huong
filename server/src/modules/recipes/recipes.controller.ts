import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Put,
    Query,
    Request,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import 'multer'; // brings the Express.Multer.File global augmentation into scope
import { Role } from '@prisma/client';
import { RecipesService } from './recipes.service';
import { RecipeLinksService } from './recipe-links.service';
import { NutritionalValueService } from './nutritional-value.service';
import { SupabaseService } from '../../shared/supabase.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateRecipeDto } from './dtos/create-recipe.dto';
import { UpdateRecipeDto } from './dtos/update-recipe.dto';
import { DiscoverRecipesDto } from './dtos/discover-recipes.dto';
import { CreateRecipeLinkDto } from './dtos/create-recipe-link.dto';

interface AuthedRequest {
    user: { userId: string; email: string; role: string };
}

// Reads use OptionalJwtAuthGuard: req.user is present for authenticated callers
// (so authors can see their own drafts) and undefined for anonymous readers.
interface OptionalAuthedRequest {
    user?: { userId: string; email: string; role: string };
}

@Controller('recipes')
export class RecipesController {
    constructor(
        private readonly recipes: RecipesService,
        private readonly links: RecipeLinksService,
        private readonly nutrition: NutritionalValueService,
        private readonly supabase: SupabaseService,
    ) { }

    /**
     * Discovery — published recipes only, with optional search / filters / sort.
     * Optional auth: a signed-in caller's rows carry their own like row, so
     * cards can render the heart without a per-recipe likes request.
     */
    @Get()
    @UseGuards(OptionalJwtAuthGuard)
    findAll(@Query() query: DiscoverRecipesDto, @Request() req: OptionalAuthedRequest) {
        return this.recipes.findAll(query, req.user);
    }

    /**
     * The caller's own recipes, Drafts included (Discovery is published-only).
     * Declared before @Get(':id') so 'mine' is never parsed as an id.
     */
    @Get('mine')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN, Role.WRITER)
    findMine(@Request() req: AuthedRequest) {
        return this.recipes.findMine(req.user.userId);
    }

    /**
     * The caller's saved list — recipes they liked (M5). Any signed-in user,
     * readers included (unlike 'mine', which is authoring-only). PUBLISHED only,
     * most-recently-saved first. Declared before @Get(':id') so 'liked' is
     * never parsed as a numeric id.
     */
    @Get('liked')
    @UseGuards(JwtAuthGuard)
    findLiked(@Request() req: AuthedRequest) {
        return this.recipes.findLiked(req.user.userId);
    }

    /** Read by clean slug (e.g. /recipes/slug/banh-mi). Draft-aware. */
    @Get('slug/:slug')
    @UseGuards(OptionalJwtAuthGuard)
    findBySlug(@Param('slug') slug: string, @Request() req: OptionalAuthedRequest) {
        return this.recipes.findBySlug(slug, req.user);
    }

    @Get(':id')
    @UseGuards(OptionalJwtAuthGuard)
    findOne(@Param('id', ParseIntPipe) id: number, @Request() req: OptionalAuthedRequest) {
        return this.recipes.findOne(id, req.user);
    }

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN, Role.WRITER)
    create(
        @Body() dto: CreateRecipeDto,
        @Query('force') force: string | undefined,
        @Request() req: AuthedRequest,
    ) {
        // ?force=true → publish even if incomplete (author confirmed the warning)
        return this.recipes.create(dto, req.user.userId, force === 'true');
    }

    @Put(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN, Role.WRITER)
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateRecipeDto,
        @Query('force') force: string | undefined,
        @Request() req: AuthedRequest,
    ) {
        // ?force=true → save an incomplete PUBLISHED recipe anyway (drafts never gate)
        return this.recipes.update(id, dto, req.user.userId, req.user.role, force === 'true');
    }

    @Patch(':id/publish')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN, Role.WRITER)
    publish(
        @Param('id', ParseIntPipe) id: number,
        @Query('force') force: string | undefined,
        @Request() req: AuthedRequest,
    ) {
        // ?force=true → publish anyway despite the incomplete-fields warning
        return this.recipes.publish(id, req.user.userId, req.user.role, force === 'true');
    }

    @Patch(':id/unpublish')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN, Role.WRITER)
    unpublish(@Param('id', ParseIntPipe) id: number, @Request() req: AuthedRequest) {
        return this.recipes.unpublish(id, req.user.userId, req.user.role);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN, Role.WRITER)
    @HttpCode(204)
    remove(@Param('id', ParseIntPipe) id: number, @Request() req: AuthedRequest) {
        return this.recipes.remove(id, req.user.userId, req.user.role);
    }

    // ─── Linking (M3) ──────────────────────────────────────────────────
    // Connect recipes three ways (PAIRS_WITH / USES / VARIATION_OF). Nothing
    // composes across a link — see RecipeLinksService for the rules.

    @Post(':id/links')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN, Role.WRITER)
    createLink(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: CreateRecipeLinkDto,
        @Request() req: AuthedRequest,
    ) {
        return this.links.create(id, dto.toId, dto.kind, req.user.userId, req.user.role);
    }

    /** A recipe's links, both directions; draft targets hidden. Draft-aware. */
    @Get(':id/links')
    @UseGuards(OptionalJwtAuthGuard)
    listLinks(@Param('id', ParseIntPipe) id: number, @Request() req: OptionalAuthedRequest) {
        return this.links.list(id, req.user);
    }

    @Delete(':id/links/:linkId')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN, Role.WRITER)
    @HttpCode(204)
    removeLink(
        @Param('id', ParseIntPipe) id: number,
        @Param('linkId', ParseIntPipe) linkId: number,
        @Request() req: AuthedRequest,
    ) {
        return this.links.remove(id, linkId, req.user.userId, req.user.role);
    }

    /** On-demand nutrition totals; not persisted. Draft-aware (see findOne). */
    @Get(':id/nutrition')
    @UseGuards(OptionalJwtAuthGuard)
    async getRecipeNutrition(
        @Param('id', ParseIntPipe) id: number,
        @Request() req: OptionalAuthedRequest,
    ) {
        // Enforce the same draft visibility as the recipe read, so this endpoint
        // can't be used as an oracle to confirm a hidden draft or read its
        // ingredient composition.
        await this.recipes.assertReadable(id, req.user);
        return this.nutrition.calculateRecipeNutrition(id);
    }

    @Post('upload-image')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN, Role.WRITER)
    @UseInterceptors(FileInterceptor('file'))
    async uploadImage(@UploadedFile() file: Express.Multer.File) {
        if (!file) throw new BadRequestException('No file uploaded');
        if (!file.mimetype.startsWith('image/')) {
            throw new BadRequestException('Uploaded file must be an image');
        }
        const ext = file.originalname.split('.').pop() ?? 'jpg';
        const fileName = `${crypto.randomUUID()}.${ext}`;
        const url = await this.supabase.uploadFile(fileName, file.buffer, file.mimetype);
        return { imageUrl: url };
    }
}
