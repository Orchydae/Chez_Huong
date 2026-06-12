import { Injectable, ConflictException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { AuthResponseDto } from './dto/auth-response.dto';
import { CreateUserDto } from '../users/dtos/create-user.dto';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
    ) { }

    async validateUser(email: string, pass: string): Promise<Express.User | null> {
        const user = await this.usersService.findByEmailWithCredentials(email);
        if (user && user.password && (await argon2.verify(user.password, pass))) {
            return {
                userId: user.id,
                email: user.email,
                role: user.role,
                firstName: user.firstName,
                lastName: user.lastName,
            };
        }
        return null;
    }

    login(user: Express.User): AuthResponseDto {
        const payload = {
            sub: user.userId,
            email: user.email,
            role: user.role,
            firstName: user.firstName,
        };
        return new AuthResponseDto(this.jwtService.sign(payload));
    }

    async register(createUserDto: CreateUserDto): Promise<AuthResponseDto> {
        const existingUser = await this.usersService.findByEmail(createUserDto.email);
        if (existingUser) {
            throw new ConflictException('User already exists');
        }

        const hashedPassword = await argon2.hash(createUserDto.password);
        const newUser = await this.usersService.create({
            ...createUserDto,
            password: hashedPassword,
        });

        return this.login({
            userId: newUser.id,
            email: newUser.email,
            role: newUser.role,
            firstName: newUser.firstName,
            lastName: newUser.lastName,
        });
    }
}
