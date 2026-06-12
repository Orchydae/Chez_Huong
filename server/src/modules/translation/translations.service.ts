import { Injectable } from '@nestjs/common';
import { Prisma, Translation, TranslationStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface UpsertTranslationInput {
    recipeId: number;
    field: string;
    locale: string;
    value: string;
    translatorId: string;
}

/**
 * Persistence + read access for stored Recipe Translations.
 * One row per (recipeId, field, locale). Saving via POST/PUT writes the
 * caller's user id as `translatorId` and marks the row APPROVED — DRAFT
 * workflow is deferred (see CONTEXT.md "Hybrid translation policy").
 *
 * Prisma errors (e.g. a non-existent recipeId → P2003, a missing translation
 * id on update/delete → P2025) propagate to the global PrismaExceptionFilter,
 * which maps them to 400 / 404. No per-method try/catch here.
 */
@Injectable()
export class TranslationsService {
    constructor(private readonly prisma: PrismaService) { }

    list(filter: { recipeId?: number; locale?: string }): Promise<Translation[]> {
        const where: Prisma.TranslationWhereInput = {};
        if (filter.recipeId !== undefined) where.recipeId = filter.recipeId;
        if (filter.locale !== undefined) where.locale = filter.locale;
        return this.prisma.translation.findMany({
            where,
            orderBy: [{ recipeId: 'asc' }, { locale: 'asc' }, { field: 'asc' }],
        });
    }

    /**
     * Create or replace the translation for one (recipeId, field, locale) triple.
     * The unique key makes this naturally idempotent.
     */
    upsert(input: UpsertTranslationInput): Promise<Translation> {
        const { recipeId, field, locale, value, translatorId } = input;
        return this.prisma.translation.upsert({
            where: { recipeId_field_locale: { recipeId, field, locale } },
            create: {
                recipeId,
                field,
                locale,
                value,
                translatorId,
                status: TranslationStatus.APPROVED,
            },
            update: {
                value,
                translatorId,
                status: TranslationStatus.APPROVED,
            },
        });
    }

    updateValue(id: number, value: string, translatorId: string): Promise<Translation> {
        return this.prisma.translation.update({
            where: { id },
            data: { value, translatorId, status: TranslationStatus.APPROVED },
        });
    }

    async remove(id: number): Promise<void> {
        await this.prisma.translation.delete({ where: { id } });
    }
}
