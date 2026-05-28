import { Body, Controller, Get, Param, Post, Put, Request, UploadedFile, UseInterceptors, UseGuards, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RecipesService } from '../../application/services/recipes.service';
import { NutritionalValueService } from '../../application/services/nutritional-value.service';
import { SupabaseExternal } from '../../../../shared/external/supabase.external';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CreateRecipeDto } from './dtos/create-recipe.dto';
import { UpdateRecipeDto } from './dtos/update-recipe.dto';
import { CreateRecipeCommand } from '../../application/commands/create-recipe.command';
import { UpdateRecipeCommand } from '../../application/commands/update-recipe.command';
import {
    TimeUnit,
    RecipeIngredient,
    IngredientSection,
    Step,
    StepSection,
} from '../../domain/entities/recipe.entity';

interface AuthenticatedRequest {
    user: { userId: string; email: string; role: string };
}

@Controller('recipes')
export class RecipesController {
    constructor(
        private readonly recipesService: RecipesService,
        private readonly nutritionalValueService: NutritionalValueService,
        private readonly supabaseExternal: SupabaseExternal,
    ) { }

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN, Role.WRITER)
    create(@Body() dto: CreateRecipeDto, @Request() req: AuthenticatedRequest) {
        const command = this.mapDtoToCreateCommand(dto, req.user.userId);
        return this.recipesService.create(command);
    }

    @Put(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN, Role.WRITER)
    update(@Param('id') id: string, @Body() dto: UpdateRecipeDto, @Request() req: AuthenticatedRequest) {
        const command = this.mapDtoToUpdateCommand(dto, +id, req.user.userId, req.user.role);
        return this.recipesService.update(command);
    }

    private mapDtoToIngredientSections(dto: CreateRecipeDto | UpdateRecipeDto): IngredientSection[] {
        return dto.ingredientSections.map(section =>
            new IngredientSection(
                section.name,
                section.ingredients.map(ing =>
                    new RecipeIngredient(ing.ingredientId, ing.quantity, ing.unit),
                ),
            ),
        );
    }

    private mapDtoToStepSections(dto: CreateRecipeDto | UpdateRecipeDto): StepSection[] {
        return dto.stepSections.map(section =>
            new StepSection(
                section.title,
                section.steps.map(step => new Step(step.order, step.description, step.mediaUrl)),
            ),
        );
    }

    private mapDtoToCreateCommand(dto: CreateRecipeDto, authorId: string): CreateRecipeCommand {
        return new CreateRecipeCommand(
            dto.title,
            dto.description,
            dto.locale,
            dto.prepTime,
            dto.prepTimeUnit || TimeUnit.MINUTES,
            dto.cookTime,
            dto.cookTimeUnit || TimeUnit.MINUTES,
            dto.difficulty,
            dto.type,
            dto.cuisine,
            dto.servings,
            authorId,
            this.mapDtoToIngredientSections(dto),
            this.mapDtoToStepSections(dto),
            dto.particularities,
            dto.imageUrl,
        );
    }

    private mapDtoToUpdateCommand(
        dto: UpdateRecipeDto,
        id: number,
        requesterUserId: string,
        requesterRole: string,
    ): UpdateRecipeCommand {
        return new UpdateRecipeCommand(
            id,
            dto.title,
            dto.description,
            dto.locale,
            dto.prepTime,
            dto.prepTimeUnit || TimeUnit.MINUTES,
            dto.cookTime,
            dto.cookTimeUnit || TimeUnit.MINUTES,
            dto.difficulty,
            dto.type,
            dto.cuisine,
            dto.servings,
            // authorId is not changed by an update; the existing recipe's author is preserved
            // via the ownership check in UpdateRecipeHandler.
            requesterUserId,
            this.mapDtoToIngredientSections(dto),
            this.mapDtoToStepSections(dto),
            dto.particularities,
            dto.imageUrl,
            requesterUserId,
            requesterRole,
        );
    }

    @Post('upload-image')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN, Role.WRITER)
    @UseInterceptors(FileInterceptor('file'))
    async uploadImage(@UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }

        // Must be an image
        if (!file.mimetype.startsWith('image/')) {
            throw new BadRequestException('Uploaded file must be an image');
        }

        const ext = file.originalname.split('.').pop() ?? 'jpg';
        const fileName = `${crypto.randomUUID()}.${ext}`;

        const url = await this.supabaseExternal.uploadFile(
            fileName,
            file.buffer,
            file.mimetype,
        );

        return { imageUrl: url };
    }

    @Get()
    findAll() {
        return this.recipesService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.recipesService.findOne(+id);
    }

    /**
     * Calculate nutritional info for a recipe on demand (not saved to DB)
     */
    @Get(':id/nutrition')
    async getRecipeNutrition(@Param('id') id: string) {
        return this.nutritionalValueService.calculateRecipeNutrition(+id);
    }
}
