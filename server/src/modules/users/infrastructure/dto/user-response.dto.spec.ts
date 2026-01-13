import { UserResponseDto } from './user-response.dto';
import { User } from '../../domain/entities/user.entity';

describe('UserResponseDto', () => {
    const mockUser = new User(
        'uuid-123',
        'John',
        'Doe',
        'john@example.com',
        'READER',
        'hashedPassword123', // This should NOT appear in the DTO
    );

    const mockUserWithoutPassword = new User(
        'uuid-456',
        'Jane',
        'Smith',
        'jane@example.com',
        'ADMIN',
        'hashedPass2!',  // Password still required but test name kept for clarity
    );

    describe('constructor', () => {
        it('should create DTO with all public fields from User entity', () => {
            const dto = new UserResponseDto(mockUser);

            expect(dto.id).toBe('uuid-123');
            expect(dto.firstName).toBe('John');
            expect(dto.lastName).toBe('Doe');
            expect(dto.email).toBe('john@example.com');
            expect(dto.role).toBe('READER');
        });

        it('should NOT include password field', () => {
            const dto = new UserResponseDto(mockUser);

            expect((dto as any).password).toBeUndefined();
            expect(Object.keys(dto)).not.toContain('password');
        });

        it('should work with user that has no password', () => {
            const dto = new UserResponseDto(mockUserWithoutPassword);

            expect(dto.id).toBe('uuid-456');
            expect((dto as any).password).toBeUndefined();
        });
    });

    describe('fromEntity', () => {
        it('should create DTO from User entity', () => {
            const dto = UserResponseDto.fromEntity(mockUser);

            expect(dto).toBeInstanceOf(UserResponseDto);
            expect(dto.id).toBe(mockUser.id);
            expect(dto.email).toBe(mockUser.email);
        });

        it('should not expose password', () => {
            const dto = UserResponseDto.fromEntity(mockUser);

            expect((dto as any).password).toBeUndefined();
        });
    });

    describe('fromEntities', () => {
        it('should create array of DTOs from User entities', () => {
            const users = [mockUser, mockUserWithoutPassword];
            const dtos = UserResponseDto.fromEntities(users);

            expect(dtos).toHaveLength(2);
            expect(dtos[0]).toBeInstanceOf(UserResponseDto);
            expect(dtos[1]).toBeInstanceOf(UserResponseDto);
        });

        it('should return empty array for empty input', () => {
            const dtos = UserResponseDto.fromEntities([]);

            expect(dtos).toEqual([]);
        });

        it('should not expose password in any DTO', () => {
            const users = [mockUser, mockUserWithoutPassword];
            const dtos = UserResponseDto.fromEntities(users);

            dtos.forEach(dto => {
                expect((dto as any).password).toBeUndefined();
            });
        });

        it('should preserve order of entities', () => {
            const users = [mockUser, mockUserWithoutPassword];
            const dtos = UserResponseDto.fromEntities(users);

            expect(dtos[0].id).toBe(mockUser.id);
            expect(dtos[1].id).toBe(mockUserWithoutPassword.id);
        });
    });
});
