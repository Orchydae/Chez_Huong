import { PrismaClient, Role } from "../generated/prisma";
import argon2 from "argon2";

const db = new PrismaClient();

async function main() {
    // ----- USERS -----
    const hashedPassword = await argon2.hash("123qwe");
    const [admin, alice, bob] = await Promise.all([
        db.user.upsert({
            where: { email: "admin@chezhuong.com" },
            update: {},
            create: {
                email: "admin@chezhuong.com",
                firstName: "Davidoo",
                lastName: "Admin",
                passwordHash: hashedPassword,
                role: Role.ADMIN,
            },
        }),
        db.user.upsert({
            where: { email: "alice@chezhuong.com" },
            update: {},
            create: {
                email: "alice@chezhuong.com",
                firstName: "Alice",
                lastName: "Wonderland",
                passwordHash: hashedPassword,
                role: Role.VISITOR,
            },
        }),
        db.user.upsert({
            where: { email: "bob@chezhuong.com" },
            update: {},
            create: {
                email: "bob@chezhuong.com",
                firstName: "Bob",
                lastName: "Builder",
                passwordHash: hashedPassword,
                role: Role.EDITOR,
            },
        }),
    ]);

}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await db.$disconnect();
    });
