import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { IUsersRepository } from '../../domain/ports/users.port';
import { User } from '../../domain/entities/user.entity';

describe('UsersService', () => {
    let service: UsersService;
    let mockUsersRepository: jest.Mocked<IUsersRepository>;

    // Sample test data
    const mockUsers: User[] = [
        new User('uuid-1', 'John', 'Doe', 'john@example.com', 'READER', 'hashedPass1!'),
        new User('uuid-2', 'Jane', 'Smith', 'jane@example.com', 'WRITER', 'hashedPass2!'),
        new User('uuid-3', 'Admin', 'User', 'admin@example.com', 'ADMIN', 'hashedPass3!'),
    ];

    beforeEach(async () => {
        // Create mock repository
        mockUsersRepository = {
            getAll: jest.fn(),
            findByEmail: jest.fn(),
            create: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UsersService,
                {
                    provide: IUsersRepository,
                    useValue: mockUsersRepository,
                },
            ],
        }).compile();

        service = module.get<UsersService>(UsersService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getAll', () => {
        it('should call repository with correct pagination parameters', async () => {
            mockUsersRepository.getAll.mockResolvedValue([]);

            await service.getAll(10, 5);

            expect(mockUsersRepository.getAll).toHaveBeenCalledWith(10, 5);
            expect(mockUsersRepository.getAll).toHaveBeenCalledTimes(1);
        });

        it('should return empty array when no users exist', async () => {
            mockUsersRepository.getAll.mockResolvedValue([]);

            const result = await service.getAll(20, 0);

            expect(result).toEqual([]);
        });

        it('should return users from repository', async () => {
            mockUsersRepository.getAll.mockResolvedValue(mockUsers);

            const result = await service.getAll(20, 0);

            expect(result).toEqual(mockUsers);
            expect(result).toHaveLength(3);
        });

        it('should pass through pagination correctly', async () => {
            const paginatedUsers = [mockUsers[1]]; // Second user only
            mockUsersRepository.getAll.mockResolvedValue(paginatedUsers);

            const result = await service.getAll(1, 1);

            expect(mockUsersRepository.getAll).toHaveBeenCalledWith(1, 1);
            expect(result).toEqual(paginatedUsers);
        });
    });

    describe('findByEmail', () => {
        it('should return user when found', async () => {
            const expectedUser = mockUsers[0];
            mockUsersRepository.findByEmail.mockResolvedValue(expectedUser);

            const result = await service.findByEmail('john@example.com');

            expect(mockUsersRepository.findByEmail).toHaveBeenCalledWith('john@example.com');
            expect(result).toEqual(expectedUser);
        });

        it('should return null when user not found', async () => {
            mockUsersRepository.findByEmail.mockResolvedValue(null);

            const result = await service.findByEmail('nonexistent@example.com');

            expect(mockUsersRepository.findByEmail).toHaveBeenCalledWith('nonexistent@example.com');
            expect(result).toBeNull();
        });

        it('should handle email case sensitivity as repository defines it', async () => {
            mockUsersRepository.findByEmail.mockResolvedValue(null);

            await service.findByEmail('JOHN@EXAMPLE.COM');

            expect(mockUsersRepository.findByEmail).toHaveBeenCalledWith('JOHN@EXAMPLE.COM');
        });
    });

    describe('create', () => {
        const createUserData = {
            firstName: 'New',
            lastName: 'User',
            email: 'new@example.com',
            password: 'hashedPassword123',
        };

        it('should pass data to repository', async () => {
            const createdUser = new User('new-uuid', 'New', 'User', 'new@example.com', 'READER', 'hashedPass1!');
            mockUsersRepository.create.mockResolvedValue(createdUser);

            await service.create(createUserData);

            expect(mockUsersRepository.create).toHaveBeenCalledWith(createUserData);
            expect(mockUsersRepository.create).toHaveBeenCalledTimes(1);
        });

        it('should return created user from repository', async () => {
            const createdUser = new User('new-uuid', 'New', 'User', 'new@example.com', 'READER', 'hashedPass1!');
            mockUsersRepository.create.mockResolvedValue(createdUser);

            const result = await service.create(createUserData);

            expect(result).toEqual(createdUser);
        });

        it('should propagate repository errors', async () => {
            const error = new Error('Database error');
            mockUsersRepository.create.mockRejectedValue(error);

            await expect(service.create(createUserData)).rejects.toThrow('Database error');
        });
    });
});
