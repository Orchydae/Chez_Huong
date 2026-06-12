import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Post,
    Put,
    Query,
    Request,
    UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { TranslationsService } from './translations.service';
import { UpsertTranslationDto } from './dtos/upsert-translation.dto';
import { UpdateTranslationDto } from './dtos/update-translation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

interface AuthedRequest {
    user: { userId: string };
}

/**
 * CRUD for stored Recipe Translations. Backs the human-curated half of
 * the hybrid translation policy described in CONTEXT.md.
 */
@Controller('translations')
export class TranslationsController {
    constructor(private readonly translations: TranslationsService) { }

    /** List stored translations, optionally filtered by recipe + locale. Public read. */
    @Get()
    list(@Query('recipeId') recipeId?: string, @Query('locale') locale?: string) {
        return this.translations.list({
            recipeId: recipeId !== undefined ? parseInt(recipeId, 10) : undefined,
            locale,
        });
    }

    /**
     * Create or replace the translation for (recipeId, field, locale).
     * Idempotent — re-posting the same triple overwrites.
     */
    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN, Role.WRITER)
    upsert(@Body() dto: UpsertTranslationDto, @Request() req: AuthedRequest) {
        return this.translations.upsert({ ...dto, translatorId: req.user.userId });
    }

    @Put(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN, Role.WRITER)
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateTranslationDto,
        @Request() req: AuthedRequest,
    ) {
        return this.translations.updateValue(id, dto.value, req.user.userId);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN, Role.WRITER)
    async remove(@Param('id', ParseIntPipe) id: number) {
        await this.translations.remove(id);
        return { id };
    }
}
