import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UsersController } from './infrastructure/controllers/users.controller';
import { UsersService } from './application/services/users.service';
import { PrismaUsersRepository } from './infrastructure/adapters/prisma.users.repository';
import { IUsersRepository } from './domain/ports/users.port';

@Module({
    imports: [PrismaModule],
    controllers: [UsersController],
    providers: [
        UsersService,
        {
            provide: IUsersRepository,
            useClass: PrismaUsersRepository,
        },
    ],
    exports: [UsersService],
})
export class UsersModule { }
