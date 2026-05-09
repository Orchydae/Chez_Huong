import { PrismaClient, Role } from '@prisma/client';
import * as argon2 from 'argon2';

const db = new PrismaClient();

async function main() {
    console.log('Seeding users...');

    // Hash default password
    const password = await argon2.hash('password123');
    const password2 = await argon2.hash('wawawa');

    // 0. Test User
    const testUser = await db.user.upsert({
        where: { email: 'wawa@wawa.com' },
        update: {},
        create: {
            firstName: 'Wawa',
            lastName: 'Admin',
            email: 'wawa@wawa.com',
            password: password2,
            role: Role.ADMIN,
        },
    });
    console.log(`User created/found: ${testUser.email} (ADMIN)`);

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

    // ─── Recipe: Yogurt, Strawberries & Cereals ────────────────────────────
    console.log('Seeding recipe...');

    // 1. Upsert ingredients
    const yogurt = await db.ingredient.upsert({
        where: { name: 'Yogourt nature' },
        update: {},
        create: { name: 'Yogourt nature' },
    });
    const strawberries = await db.ingredient.upsert({
        where: { name: 'Fraises fraîches' },
        update: {},
        create: { name: 'Fraises fraîches' },
    });
    const cereals = await db.ingredient.upsert({
        where: { name: 'Céréales de blé' },
        update: {},
        create: { name: 'Céréales de blé' },
    });
    const honey = await db.ingredient.upsert({
        where: { name: 'Miel' },
        update: {},
        create: { name: 'Miel' },
    });

    // 2. Create the recipe with nested sections
    const recipe = await db.recipe.create({
        data: {
            title: 'Yogourt aux fraises et céréales',
            description: 'Un petit-déjeuner rapide, frais et nutritif qui se prépare en quelques minutes. Idéal pour bien démarrer la journée.',
            locale: 'fr',
            prepTime: 5,
            prepTimeUnit: 'MINUTES',
            cookTime: 0,
            cookTimeUnit: 'MINUTES',
            difficulty: 'EASY',
            type: 'BREAKFAST',
            cuisine: 'International',
            servings: 1,
            imageUrl: 'https://plus.unsplash.com/premium_photo-1663840225386-69808c28aa99?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8eW9ndXJ0JTIwc3RyYXdiZXJyeXxlbnwwfHwwfHx8MA%3D%3D',
            authorId: writer.id,

            ingredientSections: {
                create: [
                    {
                        name: 'Ingrédients',
                        ingredients: {
                            create: [
                                { ingredientId: yogurt.id, quantity: '150', unit: 'g' },
                                { ingredientId: strawberries.id, quantity: '80', unit: 'g' },
                                { ingredientId: cereals.id, quantity: '40', unit: 'g' },
                                { ingredientId: honey.id, quantity: '1', unit: 'c. à soupe' },
                            ],
                        },
                    },
                ],
            },

            stepSections: {
                create: [
                    {
                        title: 'Préparation',
                        steps: {
                            create: [
                                {
                                    order: 1,
                                    description: 'Rincez et équeutez les fraises, puis coupez-les en deux ou en quartiers selon leur taille.',
                                },
                                {
                                    order: 2,
                                    description: 'Versez le yogourt dans un bol.',
                                },
                                {
                                    order: 3,
                                    description: 'Ajoutez les céréales sur le yogourt pour qu\'elles restent croquantes.',
                                },
                                {
                                    order: 4,
                                    description: 'Disposez les fraises par-dessus et terminez avec un filet de miel. Servez immédiatement.',
                                },
                            ],
                        },
                    },
                ],
            },
        },
    });

    console.log(`Recipe created: "${recipe.title}" (id: ${recipe.id}) by ${writer.email}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await db.$disconnect();
    });
