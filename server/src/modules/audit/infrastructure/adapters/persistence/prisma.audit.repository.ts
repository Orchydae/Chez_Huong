import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../prisma/prisma.service';
import { IAuditRepository } from '../../../domain/ports/audit.port';
import { CreateAuditLogDto } from '../../../application/dtos/create-audit-log.dto';
import { AuditLog } from '../../../domain/entities/audit-log.entity';
import { AuditLog as PrismaAuditLog } from '@prisma/client';

@Injectable()
export class PrismaAuditRepository implements IAuditRepository {
    constructor(private readonly prisma: PrismaService) { }

    async create(dto: CreateAuditLogDto): Promise<AuditLog> {
        const created = await this.prisma.auditLog.create({
            data: {
                userId: dto.userId,
                userEmail: dto.userEmail,
                action: dto.action,
                resourceType: dto.resourceType,
                resourceId: dto.resourceId,
                metadata: dto.metadata ?? undefined, // Handle null/undefined explicitly if needed, though Prisma handles optional Json?
                ipAddress: dto.ipAddress,
                userAgent: dto.userAgent,
            },
        });
        return this.toDomain(created);
    }

    async findByUserId(userId: string): Promise<AuditLog[]> {
        const logs = await this.prisma.auditLog.findMany({
            where: { userId },
            orderBy: { timestamp: 'desc' },
        });
        return logs.map(this.toDomain);
    }

    async findByAction(action: string): Promise<AuditLog[]> {
        const logs = await this.prisma.auditLog.findMany({
            where: { action },
            orderBy: { timestamp: 'desc' },
        });
        return logs.map(this.toDomain);
    }

    async findByResourceType(resourceType: string): Promise<AuditLog[]> {
        const logs = await this.prisma.auditLog.findMany({
            where: { resourceType },
            orderBy: { timestamp: 'desc' },
        });
        return logs.map(this.toDomain);
    }

    async findAll(options?: { limit?: number; offset?: number }): Promise<AuditLog[]> {
        const logs = await this.prisma.auditLog.findMany({
            take: options?.limit,
            skip: options?.offset,
            orderBy: { timestamp: 'desc' },
        });
        return logs.map(this.toDomain);
    }

    private toDomain(prismaLog: PrismaAuditLog): AuditLog {
        return new AuditLog(
            prismaLog.id,
            prismaLog.timestamp,
            prismaLog.userId,
            prismaLog.userEmail,
            prismaLog.action,
            prismaLog.resourceType,
            prismaLog.resourceId,
            prismaLog.metadata,
            prismaLog.ipAddress,
            prismaLog.userAgent,
        );
    }
}
