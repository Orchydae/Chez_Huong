import { PrismaClient, Role } from '@prisma/client';
import * as argon2 from 'argon2';

const db = new PrismaClient();

async function main() {
    console.log('Seeding users...');

    // Hash default password
    const password = await argon2.hash('password123');

    // 1. Admin User
    const admin = await db.user.upsert({
        where: { email: 'admin@chezhuong.com' },
        update: {},
        create: {
            firstName: 'Admin',
            lastName: 'User',
            email: 'admin@chezhuong.com',
            password: password,
            role: Role.ADMIN,
        },
    });
    console.log(`User created/found: ${admin.email} (ADMIN)`);

    // 2. Writer User
    const writer = await db.user.upsert({
        where: { email: 'writer@chezhuong.com' },
        update: {},
        create: {
            firstName: 'Writer',
            lastName: 'User',
            email: 'writer@chezhuong.com',
            password: password,
            role: Role.WRITER,
        },
    });
    console.log(`User created/found: ${writer.email} (WRITER)`);

    // 3. Reader User
    const reader = await db.user.upsert({
        where: { email: 'reader@chezhuong.com' },
        update: {},
        create: {
            firstName: 'Reader',
            lastName: 'User',
            email: 'reader@chezhuong.com',
            password: password,
            role: Role.READER,
        },
    });
    console.log(`User created/found: ${reader.email} (READER)`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await db.$disconnect();
    });
