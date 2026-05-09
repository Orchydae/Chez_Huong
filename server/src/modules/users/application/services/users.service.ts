import { Inject, Injectable } from '@nestjs/common';
import { IUsersRepository } from '../../domain/ports/users.port';
import { User } from '../../domain/entities/user.entity';

@Injectable()
export class UsersService {
    constructor(
        @Inject(IUsersRepository)
        private readonly usersRepository: IUsersRepository
    ) { }

    async getAll(take: number, skip: number): Promise<User[]> {
        return this.usersRepository.getAll(take, skip);
    }

    async findByEmail(email: string): Promise<User | null> {
        return this.usersRepository.findByEmail(email);
    }

    async create(data: any): Promise<User> {
        return this.usersRepository.create(data);
    }
}
