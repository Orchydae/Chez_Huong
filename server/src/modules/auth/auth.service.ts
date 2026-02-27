
import { Injectable, ConflictException } from '@nestjs/common';
import { UsersService } from '../users/application/services/users.service';
import { JwtService } from '@nestjs/jwt'
import * as argon2 from 'argon2';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuditAction } from '../audit/domain/enums/audit-action.enum';
import { AuthResponseDto, ValidatedUserDto } from './dto/auth-response.dto';
import { CreateUserDto } from '../users/infrastructure/dto/create-user.dto';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
        private eventEmitter: EventEmitter2,
    ) { }

    async validateUser(email: string, pass: string): Promise<ValidatedUserDto | null> {
        const user = await this.usersService.findByEmail(email);
        if (user && user.password && (await argon2.verify(user.password, pass))) {
            // Stripping the password from the returned object before returning it
            return new ValidatedUserDto(
                user.id,
                user.firstName,
                user.lastName,
                user.email,
                user.role,
            );
        }
        return null;
    }

    async login(user: ValidatedUserDto): Promise<AuthResponseDto> {
        const payload = { email: user.email, sub: user.id, role: user.role, firstName: user.firstName };

        this.eventEmitter.emit('audit.user', {
            userId: user.id,
            userEmail: user.email,
            action: AuditAction.USER_LOGIN,
            resourceType: 'User',
            resourceId: user.id,
        });

        return new AuthResponseDto(this.jwtService.sign(payload));
    }

    async register(createUserDto: CreateUserDto): Promise<AuthResponseDto> {
        // Check if user exists
        const existingUser = await this.usersService.findByEmail(createUserDto.email);
        if (existingUser) {
            throw new ConflictException('User already exists');
        }

        // Hash password
        const hashedPassword = await argon2.hash(createUserDto.password);

        // Create user
        const newUser = await this.usersService.create({
            ...createUserDto,
            password: hashedPassword,
        });

        // Create validated user for login (without password)
        const validatedUser = new ValidatedUserDto(
            newUser.id,
            newUser.firstName,
            newUser.lastName,
            newUser.email,
            newUser.role,
        );

        // Login
        return this.login(validatedUser);
    }
}
