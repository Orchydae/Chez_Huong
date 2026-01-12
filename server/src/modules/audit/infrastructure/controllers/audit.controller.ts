import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuditService } from '../../application/services/audit.service';
import { IAuditRepository } from '../../domain/ports/audit.port';
import { Inject } from '@nestjs/common';
import { GetAuditLogsDto } from '../dtos/get-audit-logs.dto';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('audit')
export class AuditController {
    constructor(
        @Inject(IAuditRepository)
        private readonly repository: IAuditRepository,
    ) { }

    @Get()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    async findAll(@Query() query: GetAuditLogsDto) {
        return this.repository.findAll({ limit: query.limit, offset: query.offset });
    }

    @Get('user/:userId')
    @UseGuards(JwtAuthGuard)
    async findByUser(@Param('userId') userId: string) {
        return this.repository.findByUserId(userId);
    }

    @Get('action/:action')
    @UseGuards(JwtAuthGuard)
    async findByAction(@Param('action') action: string) {
        return this.repository.findByAction(action);
    }
}
