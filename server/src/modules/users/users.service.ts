import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { userListInput, UserListSelectDto } from './dto/user.select';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll(take = 20, skip = 0): Promise<UserListSelectDto[]> {
    return this.prisma.user.findMany({
      select: userListInput,
      take,
      skip,
      orderBy: { id: 'asc' },
    });
  }
}
