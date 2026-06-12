import { BadRequestException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from './users.service';

// updateRole carries the one piece of real branching logic in this service —
// the self-lockout guard. The Prisma call itself is a thin pass-through, so a
// stubbed client is enough; no DB is touched.
describe('UsersService.updateRole', () => {
    const update = jest.fn();
    const prisma = { user: { update } } as unknown as PrismaService;
    const service = new UsersService(prisma);

    beforeEach(() => update.mockReset());

    it('refuses to change the acting admin\'s own role', async () => {
        await expect(service.updateRole('admin-1', Role.READER, 'admin-1')).rejects.toBeInstanceOf(
            BadRequestException,
        );
        expect(update).not.toHaveBeenCalled();
    });

    it('promotes another user to the requested role', async () => {
        const promoted = { id: 'user-2', role: Role.WRITER };
        update.mockResolvedValue(promoted);

        await expect(service.updateRole('user-2', Role.WRITER, 'admin-1')).resolves.toBe(promoted);
        expect(update).toHaveBeenCalledWith({
            where: { id: 'user-2' },
            data: { role: Role.WRITER },
            select: expect.any(Object),
        });
    });
});
