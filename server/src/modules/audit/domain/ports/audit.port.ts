import { AuditLog } from '../entities/audit-log.entity';
import { CreateAuditLogDto } from '../../application/dtos/create-audit-log.dto';

export const IAuditRepository = Symbol('IAuditRepository');

export interface IAuditRepository {
    create(log: CreateAuditLogDto): Promise<AuditLog>;
    findByUserId(userId: string): Promise<AuditLog[]>;
    findByAction(action: string): Promise<AuditLog[]>;
    findByResourceType(resourceType: string): Promise<AuditLog[]>;
    findAll(options?: { limit?: number; offset?: number }): Promise<AuditLog[]>;
}
