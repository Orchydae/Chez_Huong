import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { IUsersRepository } from '../../domain/ports/users.port';
import { User } from '../../domain/entities/user.entity';
import { Prisma, Role } from '@prisma/client';

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

    async findByEmail(email: string): Promise<User | null> {
        // ... (this part is unchanged, but I must provide the full block for context if I use replace_file_content with a large range, but I can narrow it down)
        return this.prisma.user.findUnique({
            where: { email },
            select: {
                ...userListInput,
                password: true, // We need the password for auth validation
            },
        }) as unknown as User;
    }

    async create(data: any): Promise<User> {
        return this.prisma.user.create({
            data: {
                ...data,
                role: Role.READER, // Default role
            },
            select: userListInput,
        }) as unknown as User;
    }
}
