import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from '../../application/services/users.service';
import { User } from '../../domain/entities/user.entity';
import { UserResponseDto } from '../dto/user-response.dto';

describe('UsersController', () => {
    let controller: UsersController;
    let mockUsersService: jest.Mocked<UsersService>;

    // Sample test data - note: includes password to verify it's stripped
    const mockUsers: User[] = [
        new User('uuid-1', 'John', 'Doe', 'john@example.com', 'READER', 'password123'),
        new User('uuid-2', 'Jane', 'Smith', 'jane@example.com', 'WRITER', 'password456'),
    ];

    beforeEach(async () => {
        // Create mock service
        mockUsersService = {
            getAll: jest.fn(),
            findByEmail: jest.fn(),
            create: jest.fn(),
        } as any;

        const module: TestingModule = await Test.createTestingModule({
            controllers: [UsersController],
            providers: [
                {
                    provide: UsersService,
                    useValue: mockUsersService,
                },
            ],
        }).compile();

        controller = module.get<UsersController>(UsersController);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('findAll', () => {
        it('should use default values when query params not provided', async () => {
            mockUsersService.getAll.mockResolvedValue(mockUsers);

            await controller.findAll();

            expect(mockUsersService.getAll).toHaveBeenCalledWith(20, 0);
        });

        it('should use default take=20 when only skip is provided', async () => {
            mockUsersService.getAll.mockResolvedValue(mockUsers);

            await controller.findAll(undefined, '5');

            expect(mockUsersService.getAll).toHaveBeenCalledWith(20, 5);
        });

        it('should use default skip=0 when only take is provided', async () => {
            mockUsersService.getAll.mockResolvedValue(mockUsers);

            await controller.findAll('10');

            expect(mockUsersService.getAll).toHaveBeenCalledWith(10, 0);
        });

        it('should parse string query params to integers', async () => {
            mockUsersService.getAll.mockResolvedValue(mockUsers);

            await controller.findAll('15', '10');

            expect(mockUsersService.getAll).toHaveBeenCalledWith(15, 10);
        });

        it('should return UserResponseDto array', async () => {
            mockUsersService.getAll.mockResolvedValue(mockUsers);

            const result = await controller.findAll('20', '0');

            expect(result).toHaveLength(2);
            result.forEach(dto => {
                expect(dto).toBeInstanceOf(UserResponseDto);
            });
        });

        it('should NOT expose password in response', async () => {
            mockUsersService.getAll.mockResolvedValue(mockUsers);

            const result = await controller.findAll();

            result.forEach(dto => {
                expect((dto as any).password).toBeUndefined();
                expect(Object.keys(dto)).not.toContain('password');
            });
        });

        it('should return empty array when no users', async () => {
            mockUsersService.getAll.mockResolvedValue([]);

            const result = await controller.findAll();

            expect(result).toEqual([]);
        });

        it('should handle large pagination values', async () => {
            mockUsersService.getAll.mockResolvedValue([]);

            await controller.findAll('1000', '5000');

            expect(mockUsersService.getAll).toHaveBeenCalledWith(1000, 5000);
        });

        it('should map user properties correctly to DTO', async () => {
            mockUsersService.getAll.mockResolvedValue([mockUsers[0]]);

            const result = await controller.findAll();

            expect(result[0].id).toBe('uuid-1');
            expect(result[0].firstName).toBe('John');
            expect(result[0].lastName).toBe('Doe');
            expect(result[0].email).toBe('john@example.com');
            expect(result[0].role).toBe('READER');
        });
    });
});
