import { User } from '../../domain/entities/user.entity';

/**
 * DTO for user responses - excludes sensitive data like password
 */
export class UserResponseDto {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;

    constructor(user: User) {
        this.id = user.id;
        this.firstName = user.firstName;
        this.lastName = user.lastName;
        this.email = user.email;
        this.role = user.role;
        // Intentionally omitting password for security
    }

    /**
     * Factory method to create UserResponseDto from User entity
     */
    static fromEntity(user: User): UserResponseDto {
        return new UserResponseDto(user);
    }

    /**
     * Factory method to create array of UserResponseDto from User entities
     */
    static fromEntities(users: User[]): UserResponseDto[] {
        return users.map(user => UserResponseDto.fromEntity(user));
    }
}
