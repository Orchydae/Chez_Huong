import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { Request } from 'express';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (!requiredRoles || requiredRoles.length === 0) {
            return true;
        }
        const request = context.switchToHttp().getRequest<Request>();
        const user = request.user;
        // Fail safe: if no authenticated user is attached, deny.
        // This guards against accidental misconfiguration where RolesGuard
        // is applied without JwtAuthGuard ahead of it.
        if (!user?.role) {
            return false;
        }
        return requiredRoles.includes(user.role);
    }
}
