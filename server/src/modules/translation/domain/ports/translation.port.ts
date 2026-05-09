export interface TranslateRequest {
    text: string;
    targetLang: string;      // e.g., 'en', 'fr', 'vi'
    sourceLang?: string;     // optional, auto-detect if omitted
}

export interface TranslateResponse {
    translatedText: string;
    detectedSourceLang?: string;
}

export interface TranslationPort {
    translate(request: TranslateRequest): Promise<TranslateResponse>;
    getSupportedLanguages(): Promise<{ code: string; name: string }[]>;
}

export const TranslationPort = Symbol('TranslationPort');
