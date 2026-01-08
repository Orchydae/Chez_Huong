import { User } from '../entities/user.entity';

export const IUsersRepository = Symbol('IUsersRepository');

export interface IUsersRepository {
    getAll(take: number, skip: number): Promise<User[]>;
}
