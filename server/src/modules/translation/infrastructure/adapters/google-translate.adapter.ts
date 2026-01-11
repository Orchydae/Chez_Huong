import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Translate } from '@google-cloud/translate/build/src/v2';
import { TranslationPort, TranslateRequest, TranslateResponse } from '../../domain/ports/translation.port';

@Injectable()
export class GoogleTranslateAdapter implements TranslationPort {
    private client: Translate;

    constructor(private configService: ConfigService) {
        const apiKey = this.configService.get<string>('GOOGLE_CLOUD_TRANSLATION_API_KEY');
        if (!apiKey) {
            throw new Error('GOOGLE_CLOUD_TRANSLATION_API_KEY environment variable is required');
        }
        this.client = new Translate({ key: apiKey });
    }

    async translate(request: TranslateRequest): Promise<TranslateResponse> {
        const options: { to: string; from?: string } = {
            to: request.targetLang,
        };

        if (request.sourceLang) {
            options.from = request.sourceLang;
        }

        const [translation, metadata] = await this.client.translate(request.text, options);

        return {
            translatedText: translation,
            detectedSourceLang: metadata?.data?.translations?.[0]?.detectedSourceLanguage || request.sourceLang,
        };
    }

    async getSupportedLanguages(): Promise<{ code: string; name: string }[]> {
        const [languages] = await this.client.getLanguages();
        return languages.map((lang: { code: string; name: string }) => ({
            code: lang.code,
            name: lang.name,
        }));
    }
}
