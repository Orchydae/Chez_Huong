
import { Controller, Request, Post, UseGuards, Get, Body } from '@nestjs/common';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CreateUserDto } from '../users/infrastructure/dto/create-user.dto';
import { AuthResponseDto, UserProfileDto } from './dto/auth-response.dto';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @UseGuards(LocalAuthGuard)
    @Post('login')
    async login(@Request() req): Promise<AuthResponseDto> {
        return this.authService.login(req.user);
    }

    @Post('register')
    async register(@Body() createUserDto: CreateUserDto): Promise<AuthResponseDto> {
        return this.authService.register(createUserDto);
    }

    @UseGuards(JwtAuthGuard)
    @Get('profile')
    getProfile(@Request() req): UserProfileDto {
        return req.user;
    }
}
