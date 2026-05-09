import { Injectable, Inject } from '@nestjs/common';
import { TranslationPort, TranslateRequest, TranslateResponse } from '../../domain/ports/translation.port';

@Injectable()
export class TranslationService {
    constructor(
        @Inject(TranslationPort)
        private readonly translationPort: TranslationPort,
    ) { }

    async translate(request: TranslateRequest): Promise<TranslateResponse> {
        return this.translationPort.translate(request);
    }

    async getSupportedLanguages(): Promise<{ code: string; name: string }[]> {
        return this.translationPort.getSupportedLanguages();
    }
}
