import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TranslationPort } from './domain/ports/translation.port';
import { GoogleTranslateAdapter } from './infrastructure/adapters/google-translate.adapter';
import { TranslationService } from './application/services/translation.service';
import { TranslationController } from './infrastructure/controllers/translation.controller';

@Module({
    imports: [ConfigModule],
    controllers: [TranslationController],
    providers: [
        TranslationService,
        {
            provide: TranslationPort,
            useClass: GoogleTranslateAdapter,
        },
    ],
    exports: [TranslationService],
})
export class TranslationModule { }
