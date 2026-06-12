import { Body, Controller, Get, Param, Patch, Query, Request, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { UsersService } from './users.service';
import { ListUsersDto } from './dtos/list-users.dto';
import { UpdateUserRoleDto } from './dtos/update-user-role.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

interface AuthedRequest {
    user: { userId: string; email: string; role: string };
}

// Whole controller is admin-only: user management is an admin tool. Stack
// JwtAuthGuard BEFORE RolesGuard — RolesGuard is fail-safe and denies when no
// authenticated user is attached.
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Get()
    findAll(@Query() query: ListUsersDto) {
        return this.usersService.getAll(query.take, query.skip, query.q);
    }

    /** Promote/demote a user. The service refuses to change the caller's own role. */
    @Patch(':id/role')
    updateRole(
        @Param('id') id: string,
        @Body() dto: UpdateUserRoleDto,
        @Request() req: AuthedRequest,
    ) {
        return this.usersService.updateRole(id, dto.role, req.user.userId);
    }
}
