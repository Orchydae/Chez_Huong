import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UsersService } from '../../application/services/users.service';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { UserResponseDto } from '../dto/user-response.dto';

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    @Get()
    async findAll(@Query('take') take?: string, @Query('skip') skip?: string): Promise<UserResponseDto[]> {
        const users = await this.usersService.getAll(
            take ? parseInt(take, 10) : 20,
            skip ? parseInt(skip, 10) : 0
        );
        return UserResponseDto.fromEntities(users);
    }
}
