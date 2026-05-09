import { Inject, Injectable, Logger } from '@nestjs/common';
import { CreateAuditLogDto } from '../../application/dtos/create-audit-log.dto';
import { IAuditRepository } from '../../domain/ports/audit.port';

@Injectable()
export class AuditService {
    private readonly logger = new Logger(AuditService.name);

    constructor(
        @Inject(IAuditRepository)
        private readonly repository: IAuditRepository,
    ) { }

    /**
     * Logs an action to the audit database.
     * This method is "fire-and-forget" to avoid blocking the main thread.
     */
    async logAction(dto: CreateAuditLogDto): Promise<void> {
        this.repository.create(dto).catch((err) => {
            this.logger.error(`Failed to create audit log for action ${dto.action}`, err.stack);
        });
    }
}
