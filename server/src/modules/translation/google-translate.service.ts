import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Translate } from '@google-cloud/translate/build/src/v2';

export interface TranslateRequest {
    text: string;
    targetLang: string;          // e.g. 'en', 'fr', 'vi'
    sourceLang?: string;         // optional, auto-detect if omitted
}

export interface TranslateResponse {
    translatedText: string;
    detectedSourceLang?: string;
}

/**
 * Thin wrapper around the Google Cloud Translate v2 client.
 * Used by the "translate this for me" button on the frontend to pre-fill
 * a translation form. Saving the result is a separate, explicit call
 * (TranslationsService.upsert).
 */
@Injectable()
export class GoogleTranslateService {
    private readonly client: Translate;

    constructor(configService: ConfigService) {
        const apiKey = configService.get<string>('GOOGLE_CLOUD_TRANSLATION_API_KEY');
        if (!apiKey) {
            throw new Error('GOOGLE_CLOUD_TRANSLATION_API_KEY environment variable is required');
        }
        this.client = new Translate({ key: apiKey });
    }

    async translate(request: TranslateRequest): Promise<TranslateResponse> {
        const options: { to: string; from?: string } = { to: request.targetLang };
        if (request.sourceLang) options.from = request.sourceLang;

        // The v2 client types `translate` as `[string|string[], TranslateResponse]`
        // but in practice the metadata is the loose `{ data: { translations: [...] } }`
        // shape Google returns. Cast to capture the detected-source-language hint.
        const result = await this.client.translate(request.text, options) as [
            string,
            { data?: { translations?: Array<{ detectedSourceLanguage?: string }> } },
        ];
        const [translation, metadata] = result;
        return {
            translatedText: translation,
            detectedSourceLang:
                metadata?.data?.translations?.[0]?.detectedSourceLanguage ?? request.sourceLang,
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
