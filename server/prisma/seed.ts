import { Difficulty, PrismaClient, RecipeType, Role } from '@prisma/client';
import * as argon2 from 'argon2';

const db = new PrismaClient();

async function reset() {
    await db.$transaction([
        db.comment.deleteMany(),
        db.like.deleteMany(),
        db.nutritionalInfo.deleteMany(),
        db.step.deleteMany(),
        db.recipeIngredient.deleteMany(),
        db.ingredientSection.deleteMany(), // New table
        db.particularity.deleteMany(),
        db.ingredient.deleteMany(),
        db.recipe.deleteMany(),
        db.user.deleteMany(),
    ]);
}

async function main() {
    await reset();

    const password = await argon2.hash('123qwe123');

    // 1. Create Users
    const user1 = await db.user.create({
        data: {
            firstName: 'Alice',
            lastName: 'Doe',
            email: 'alice@chezhuong.com',
            password: password,
            role: Role.ADMIN,
        },
    });

    const user2 = await db.user.create({
        data: {
            firstName: 'Bob',
            lastName: 'Smith',
            email: 'bob@chezhuong.com',
            password: password,
            role: Role.READER,
        },
    });

    console.log('Users created:', { user1: user1.email, user2: user2.email });

    const glutenFree = await db.particularity.create({ data: { name: 'Sans Gluten' } });

    // 3. Create Recipe with Sections
    const recipe = await db.recipe.create({
        data: {
            title: 'Phở Gà (Chicken Pho)',
            description: 'A traditional Vietnamese chicken noodle soup.',
            prepTime: 30,
            cookTime: 120,
            difficulty: Difficulty.MEDIUM,
            type: RecipeType.MAIN,
            cuisine: 'Vietnamese',
            servings: 4,
            authorId: user1.id,

            particularities: {
                connect: [{ id: glutenFree.id }]
            },

            steps: {
                create: [
                    { order: 1, title: 'Charring', description: 'Char the ginger and onions.' },
                    { order: 2, title: 'Broth', description: 'Simmer chicken with spices.' },
                    { order: 3, title: 'Assembly', description: 'Pour hot broth over noodles and chicken.' },
                ],
            },

            // New Structure: Sections -> Ingredients
            ingredientSections: {
                create: [
                    {
                        name: 'Broth',
                        ingredients: {
                            create: [
                                {
                                    quantity: '1',
                                    unit: 'whole',
                                    ingredient: { connectOrCreate: { where: { name: 'Chicken' }, create: { name: 'Chicken' } } }
                                },
                                {
                                    quantity: '2',
                                    unit: 'pieces',
                                    ingredient: { connectOrCreate: { where: { name: 'Ginger' }, create: { name: 'Ginger' } } }
                                }
                            ]
                        }
                    },
                    {
                        name: 'Garnish',
                        ingredients: {
                            create: [
                                {
                                    quantity: '100',
                                    unit: 'g',
                                    ingredient: { connectOrCreate: { where: { name: 'Bean Sprouts' }, create: { name: 'Bean Sprouts' } } }
                                }
                            ]
                        }
                    }
                ],
            },
            nutritionalInfo: {
                create: {
                    calories: 450,
                    protein: 35,
                    fat: 10,
                    carbohydrates: 50,
                },
            },
        },
        include: {
            steps: true,
            ingredientSections: {
                include: {
                    ingredients: {
                        include: { ingredient: true }
                    }
                }
            },
            nutritionalInfo: true,
            particularities: true
        },
    });

    console.log(`Created Recipe: ${recipe.title} (${recipe.cuisine} ${recipe.type})`);

    recipe.ingredientSections.forEach(section => {
        console.log(`Section: ${section.name}`);
        section.ingredients.forEach(ri => {
            console.log(`  - ${ri.quantity} ${ri.unit} ${ri.ingredient.name}`);
        });
    });
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await db.$disconnect();
    });
