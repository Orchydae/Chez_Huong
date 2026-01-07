import { Prisma } from '@prisma/client';

export const userListInput: Prisma.UserSelect = {
    id: true,
    firstName: true,
    lastName: true,
    email: true,  
    role: true,
};

export type UserListSelectDto = Prisma.UserGetPayload<{
    select: typeof userListInput
}>;