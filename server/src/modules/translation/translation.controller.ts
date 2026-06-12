import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Role } from '@prisma/client';
import { GoogleTranslateService } from './google-translate.service';
import { TranslateDto } from './dtos/translate.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

/**
 * Live machine-translation proxy. Backs the "translate this for me" button
 * on the frontend. Does NOT persist anything — saving a translation is
 * a separate, explicit call to POST /translations.
 *
 * Both endpoints require WRITER/ADMIN: every call costs paid Google API quota
 * and only translators legitimately need them. Throttled tighter than the
 * global default since Google bills per call.
 */
@Throttle({ default: { limit: 20, ttl: 60_000 } })
@Controller('translate')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.WRITER)
export class TranslationController {
    constructor(private readonly google: GoogleTranslateService) { }

    @Post()
    translate(@Body() dto: TranslateDto) {
        return this.google.translate({
            text: dto.text,
            targetLang: dto.targetLang,
            sourceLang: dto.sourceLang,
        });
    }

    @Get('languages')
    async getSupportedLanguages() {
        const languages = await this.google.getSupportedLanguages();
        return { count: languages.length, languages };
    }
}
