import { Controller, Post, Get, Body } from '@nestjs/common';
import { TranslationService } from '../../application/services/translation.service';
import { TranslateDto } from './dtos/translate.dto';

@Controller('translate')
export class TranslationController {
    constructor(private readonly translationService: TranslationService) { }

    /**
     * Translate text to target language
     * 
     * POST /translate
     * Body: { text: string, targetLang: string, sourceLang?: string }
     */
    @Post()
    async translate(@Body() dto: TranslateDto) {
        const result = await this.translationService.translate({
            text: dto.text,
            targetLang: dto.targetLang,
            sourceLang: dto.sourceLang,
        });

        return result;
    }

    /**
     * Get list of supported languages
     * 
     * GET /translate/languages
     */
    @Get('languages')
    async getSupportedLanguages() {
        const languages = await this.translationService.getSupportedLanguages();
        return {
            count: languages.length,
            languages,
        };
    }
}
