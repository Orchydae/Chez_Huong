import { IsEnum } from 'class-validator';
import { Role } from '@prisma/client';

/** Body for PATCH /users/:id/role — the single role to assign (admin-only). */
export class UpdateUserRoleDto {
    @IsEnum(Role)
    role!: Role;
}
