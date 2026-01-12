
import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/application/services/users.service';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuditAction } from '../audit/domain/enums/audit-action.enum';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
        private eventEmitter: EventEmitter2,
    ) { }

    async validateUser(email: string, pass: string): Promise<any> {
        const user = await this.usersService.findByEmail(email);
        if (user && (await argon2.verify(user['password'], pass))) {
            // Stripping the password from the returned object before returning it
            const { password, ...result } = user as any;
            return result;
        }
        return null;
    }

    async login(user: any) {
        const payload = { email: user.email, sub: user.id, role: user.role };

        this.eventEmitter.emit('audit.user', {
            userId: user.id,
            userEmail: user.email,
            action: AuditAction.USER_LOGIN,
            resourceType: 'User',
            resourceId: user.id,
        });

        return {
            access_token: this.jwtService.sign(payload),
        };
    }

    async register(createUserDto: any) {
        // Check if user exists
        const existingUser = await this.usersService.findByEmail(createUserDto.email);
        if (existingUser) {
            throw new Error('User already exists');
        }

        // Hash password
        const hashedPassword = await argon2.hash(createUserDto.password);

        // Create user
        const newUser = await this.usersService.create({
            ...createUserDto,
            password: hashedPassword,
        });

        // Login
        return this.login(newUser);
    }
}
