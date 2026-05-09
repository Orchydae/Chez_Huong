import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditController } from './infrastructure/controllers/audit.controller';
import { AuditService } from './application/services/audit.service';
import { PrismaAuditRepository } from './infrastructure/adapters/persistence/prisma.audit.repository';
import { IAuditRepository } from './domain/ports/audit.port';
import { AuditEventListener } from './application/listeners/audit-event.listener';

@Module({
    imports: [PrismaModule],
    controllers: [AuditController],
    providers: [
        AuditService,
        AuditEventListener,
        {
            provide: IAuditRepository,
            useClass: PrismaAuditRepository,
        },
    ],
    exports: [AuditService],
})
export class AuditModule { }
