import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { TranslationController } from './translation.controller';
import { TranslationsController } from './translations.controller';
import { GoogleTranslateService } from './google-translate.service';
import { TranslationsService } from './translations.service';

@Module({
    imports: [ConfigModule, PrismaModule],
    controllers: [TranslationController, TranslationsController],
    providers: [GoogleTranslateService, TranslationsService],
})
export class TranslationModule { }
