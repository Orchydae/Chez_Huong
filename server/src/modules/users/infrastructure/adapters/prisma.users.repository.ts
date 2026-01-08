import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { IUsersRepository } from '../../domain/ports/users.port';
import { User } from '../../domain/entities/user.entity';
import { Prisma } from '@prisma/client';

export const userListInput: Prisma.UserSelect = {
    id: true,
    firstName: true,
    lastName: true,
    email: true,
    role: true,
};

@Injectable()
export class PrismaUsersRepository implements IUsersRepository {
    constructor(private readonly prisma: PrismaService) { }

    async getAll(take = 20, skip = 0): Promise<User[]> {
        return this.prisma.user.findMany({
            select: userListInput,
            take,
            skip,
            orderBy: { id: 'asc' },
        }) as unknown as User[];
    }
}
