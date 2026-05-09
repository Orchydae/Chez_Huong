import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AuditService } from '../services/audit.service';
import { CreateAuditLogDto } from '../../application/dtos/create-audit-log.dto';

@Injectable()
export class AuditEventListener {
    constructor(private readonly auditService: AuditService) { }

    @OnEvent('audit.*')
    handleAuditEvent(payload: CreateAuditLogDto) {
        this.auditService.logAction(payload);
    }
}
