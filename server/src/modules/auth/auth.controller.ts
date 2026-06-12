import { Controller, Request, Post, UseGuards, Get, Body } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request as ExpressRequest } from 'express';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CreateUserDto } from '../users/dtos/create-user.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    // Tighter limit on auth endpoints to slow brute-force attempts.
    @Throttle({ default: { limit: 5, ttl: 60_000 } })
    @UseGuards(LocalAuthGuard)
    @Post('login')
    login(@Request() req: ExpressRequest): AuthResponseDto {
        return this.authService.login(req.user!);
    }

    @Throttle({ default: { limit: 5, ttl: 60_000 } })
    @Post('register')
    register(@Body() createUserDto: CreateUserDto): Promise<AuthResponseDto> {
        return this.authService.register(createUserDto);
    }

    @UseGuards(JwtAuthGuard)
    @Get('profile')
    getProfile(@Request() req: ExpressRequest): Express.User {
        return req.user!;
    }
}
