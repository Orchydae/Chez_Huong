import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, Role, User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Columns safe to expose in API responses (no password hash).
 * Used as the select for any read that crosses the HTTP boundary.
 */
const safeUserSelect = {
    id: true,
    firstName: true,
    lastName: true,
    email: true,
    role: true,
} satisfies Prisma.UserSelect;

export type SafeUser = Prisma.UserGetPayload<{ select: typeof safeUserSelect }>;

@Injectable()
export class UsersService {
    constructor(private readonly prisma: PrismaService) { }

    getAll(take = 20, skip = 0, q?: string): Promise<SafeUser[]> {
        // q matches the admin's "find a user to promote" need — name OR email,
        // case-insensitive substring. Empty/blank q lists everyone (paginated).
        const term = q?.trim();
        const where: Prisma.UserWhereInput | undefined = term
            ? {
                OR: [
                    { email: { contains: term, mode: 'insensitive' } },
                    { firstName: { contains: term, mode: 'insensitive' } },
                    { lastName: { contains: term, mode: 'insensitive' } },
                ],
            }
            : undefined;
        return this.prisma.user.findMany({
            where,
            select: safeUserSelect,
            take,
            skip,
            orderBy: { id: 'asc' },
        });
    }

    /**
     * Promote/demote a user to a single role (admin-only at the controller).
     * Refuses to change the ACTING admin's own role: that's the one edit that
     * could lock the last admin out of the admin tools, and it's never what an
     * admin means to do from this screen. A missing target id propagates as
     * Prisma P2025 → 404 via the global PrismaExceptionFilter.
     */
    async updateRole(targetId: string, role: Role, actingUserId: string): Promise<SafeUser> {
        if (targetId === actingUserId) {
            throw new BadRequestException('You cannot change your own role');
        }
        return this.prisma.user.update({
            where: { id: targetId },
            data: { role },
            select: safeUserSelect,
        });
    }

    /**
     * Returns the full user row INCLUDING the password hash.
     * Only AuthService should call this — the password hash must never cross
     * the HTTP boundary. The explicit name is the enforcement: any caller
     * touching this is opting in to handling credentials.
     */
    findByEmailWithCredentials(email: string): Promise<User | null> {
        return this.prisma.user.findUnique({ where: { email } });
    }

    /** Safe lookup by email — no password hash. */
    findByEmail(email: string): Promise<SafeUser | null> {
        return this.prisma.user.findUnique({
            where: { email },
            select: safeUserSelect,
        });
    }

    create(data: Omit<Prisma.UserCreateInput, 'role'> & { role?: Role }): Promise<SafeUser> {
        return this.prisma.user.create({
            data: { ...data, role: data.role ?? Role.READER },
            select: safeUserSelect,
        });
    }
}
