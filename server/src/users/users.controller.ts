// NOTE TO MYSELF: a controller should only handle request/response and delegate all business logic to the service layer.
import { Controller, Get, Query } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Get()
    async findAll(@Query('take') take?: string, @Query('skip') skip?: string) {
        return this.usersService.getAll(
            take ? parseInt(take, 10) : 20,
            skip ? parseInt(skip, 10) : 0
        );
    }
}