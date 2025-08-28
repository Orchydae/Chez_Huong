import { IngredientSource, PrismaClient, Role } from "../generated/prisma";
import type { Prisma } from "../generated/prisma";
import argon2 from "argon2";

const db = new PrismaClient();

async function reset() {
    await db.$transaction([
        db.comment.deleteMany(),
        db.review.deleteMany(),
        db.instructionStep.deleteMany(),
        db.segment.deleteMany(),
        db.particularityRecipe.deleteMany(),
        db.particularity.deleteMany(),
        db.categoryRecipe.deleteMany(),
        db.category.deleteMany(),
        db.ingredientInstance.deleteMany(),
        db.ingredient.deleteMany(),
        db.nutrientValue.deleteMany(),
        db.nutrient.deleteMany(),
        db.recipe.deleteMany(),
        // Not deleting users
    ]);
}

async function upsertUsers() {
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

    return { admin, alice, bob };
}

async function upsertCategories(names: string[]) {
    return Promise.all(
        names.map((name) => (
            db.category.upsert({
                where: { name },
                update: {},
                create: { name }
            })
        ))
    );
}

async function upsertParticularities(names: string[]) {
    return Promise.all(
        names.map((name) => (
            db.particularity.upsert({
                where: { name },
                update: {},
                create: { name }
            })
        ))
    );
}

async function upsertNutrients(items: { name: string, unit: string }[]) {
    const records = await Promise.all(
        items.map(({ name, unit }) => (
            db.nutrient.upsert({
                where: { name },
                update: { unit },
                create: { name, unit }
            })
        ))
    );

    const map = new Map<string, number>(records.map(r => [r.name, r.id]));
    return { records, map };
}

async function upsertIngredients(items: { name: string, source?: IngredientSource, fdcId?: number }[]) {
    const records = await Promise.all(
        items.map(({ name, source, fdcId }) => (
            db.ingredient.upsert({
                where: { name },
                update: { source, fdcId },
                create: { name, source, fdcId }
            })
        ))
    );
    const map = new Map<string, number>(records.map(r => [r.name, r.id]));
    return { records, map };
}

async function main() {
    await reset();

    const { admin, alice, bob } = await upsertUsers();

    // Taxonomy
    const categories = await upsertCategories(['Principal', 'Salade', 'Dessert']);
    const particularities = await upsertParticularities(['Piquant', 'Végane', 'Sans gluten']);
    const pMap = new Map(particularities.map(p => [p.name, p.id]));

    const { map: nMap } = await upsertNutrients([
        { name: 'Calorie', unit: 'kcal' },
        { name: 'Protéine', unit: 'g' },
        { name: 'Glucide', unit: 'g' },
        { name: 'Lipide', unit: 'g' },
        { name: 'Fibres', unit: 'g' },
        { name: 'Sucre', unit: 'g' },
        { name: 'Sodium', unit: 'mg' }
    ]);

    const { map: iMap } = await upsertIngredients([
        { name: 'Poitrine de poulet' },
        { name: 'Huile d\'olive' },
        { name: 'Riz' },
        { name: 'Broccoli' }
    ]);

    /** Get the ID from the map or throw an error
     * This method is used to retrieve the ID and satisfy TS
     */
    const getId = (map: Map<string, number>, name: string) => {
        const id = map.get(name);
        if (!id) throw new Error(`Missing ID for ${name}`);
        return id;
    };

    // Nutrient values (basis: PER_100G)
    await db.nutrientValue.createMany({
        data: [
            // Poitrine de poulet
            { ingredientId: getId(iMap, 'Poitrine de poulet'), nutrientId: getId(nMap, 'Calorie'), amount: 165 },
            { ingredientId: getId(iMap, 'Poitrine de poulet'), nutrientId: getId(nMap, 'Protéine'), amount: 31 },
            { ingredientId: getId(iMap, 'Poitrine de poulet'), nutrientId: getId(nMap, 'Glucide'), amount: 0 },
            { ingredientId: getId(iMap, 'Poitrine de poulet'), nutrientId: getId(nMap, 'Lipide'), amount: 3.6 },
            { ingredientId: getId(iMap, 'Poitrine de poulet'), nutrientId: getId(nMap, 'Fibres'), amount: 0 },
            { ingredientId: getId(iMap, 'Poitrine de poulet'), nutrientId: getId(nMap, 'Sucre'), amount: 0 },
            { ingredientId: getId(iMap, 'Poitrine de poulet'), nutrientId: getId(nMap, 'Sodium'), amount: 74 },

            // Huile d'olive
            { ingredientId: getId(iMap, 'Huile d\'olive'), nutrientId: getId(nMap, 'Calorie'), amount: 884 },
            { ingredientId: getId(iMap, 'Huile d\'olive'), nutrientId: getId(nMap, 'Protéine'), amount: 0 },
            { ingredientId: getId(iMap, 'Huile d\'olive'), nutrientId: getId(nMap, 'Glucide'), amount: 0 },
            { ingredientId: getId(iMap, 'Huile d\'olive'), nutrientId: getId(nMap, 'Lipide'), amount: 100 },
            { ingredientId: getId(iMap, 'Huile d\'olive'), nutrientId: getId(nMap, 'Fibres'), amount: 0 },
            { ingredientId: getId(iMap, 'Huile d\'olive'), nutrientId: getId(nMap, 'Sucre'), amount: 0 },
            { ingredientId: getId(iMap, 'Huile d\'olive'), nutrientId: getId(nMap, 'Sodium'), amount: 0 },

            // Riz
            { ingredientId: getId(iMap, 'Riz'), nutrientId: getId(nMap, 'Calorie'), amount: 130 },
            { ingredientId: getId(iMap, 'Riz'), nutrientId: getId(nMap, 'Protéine'), amount: 2.7 },
            { ingredientId: getId(iMap, 'Riz'), nutrientId: getId(nMap, 'Glucide'), amount: 28.7 },
            { ingredientId: getId(iMap, 'Riz'), nutrientId: getId(nMap, 'Lipide'), amount: 0.3 },
            { ingredientId: getId(iMap, 'Riz'), nutrientId: getId(nMap, 'Fibres'), amount: 0.4 },
            { ingredientId: getId(iMap, 'Riz'), nutrientId: getId(nMap, 'Sucre'), amount: 0.1 },
            { ingredientId: getId(iMap, 'Riz'), nutrientId: getId(nMap, 'Sodium'), amount: 1 },

            // Broccoli
            { ingredientId: getId(iMap, 'Broccoli'), nutrientId: getId(nMap, 'Calorie'), amount: 55 },
            { ingredientId: getId(iMap, 'Broccoli'), nutrientId: getId(nMap, 'Protéine'), amount: 4.2 },
            { ingredientId: getId(iMap, 'Broccoli'), nutrientId: getId(nMap, 'Glucide'), amount: 11.2 },
            { ingredientId: getId(iMap, 'Broccoli'), nutrientId: getId(nMap, 'Lipide'), amount: 0.6 },
            { ingredientId: getId(iMap, 'Broccoli'), nutrientId: getId(nMap, 'Fibres'), amount: 2.6 },
            { ingredientId: getId(iMap, 'Broccoli'), nutrientId: getId(nMap, 'Sucre'), amount: 1.7 },
            { ingredientId: getId(iMap, 'Broccoli'), nutrientId: getId(nMap, 'Sodium'), amount: 33 },
        ],
        skipDuplicates: true
    });

    // === RECIPE 1: RIZ, POULET ET BROCCOLI ===
    const r1 = await db.recipe.create({
        data: {
            title: 'Riz, Poulet et Broccoli',
            description: 'Un plat plate à des fins de test.',
            difficulty: 'EASY',
            prepTime: 15,
            cookTime: 20,
            authorId: bob.id,
            categoryRecipes: {
                create: [{ category: { connect: { name: 'Principal'}}}],
            }
        }
    });

    await db.particularityRecipe.upsert({
        where: { particularityId_recipeId: { particularityId: pMap.get('Sans gluten')!, recipeId: r1.id } },
        create: { particularityId: pMap.get('Sans gluten')!, recipeId: r1.id },
        update: {}
    });

    // + Segments & Steps +
    const seg1_r1 = await db.segment.create({
        data: {
            recipeId: r1.id,
            title: 'Préparation des ingrédients'
        }
    });
    const seg2_r1 = await db.segment.create({
        data: {
            recipeId: r1.id,
            title: 'Cuisson du poulet et des légumes'
        }
    });

    await db.instructionStep.createMany({
        data: [
            {
                segmentId: seg1_r1.id,
                stepNumber: 1,
                description: 'Couper le poulet en cubes.',
            },
            {
                segmentId: seg2_r1.id,
                stepNumber: 1,
                description: 'Cuire le poulet dans une poêle.', 
            },
            {
                segmentId: seg2_r1.id,
                stepNumber: 2,
                description: 'Cuire le riz selon les instructions.',
            },
            {
                segmentId: seg2_r1.id,
                stepNumber: 3,
                description: 'Cuire le brocoli avec le poulet.',
            }, {
                segmentId: seg2_r1.id,
                stepNumber: 4,
                description: 'Servir sur du riz cuit.'
            }
        ],
        skipDuplicates: true
    });

    // Ingredient lines (per recipe)
    await db.ingredientInstance.createMany({
        data: [
            {recipeId: r1.id, ingredientId: getId(iMap, 'Riz'), grams: 100, displayQty: 100, displayUnit: 'g', sortOrder: 1},
            {recipeId: r1.id, ingredientId: getId(iMap, 'Poitrine de poulet'), grams: 200, displayQty: 2, displayUnit: 'poitrines', sortOrder: 3},
            {recipeId: r1.id, ingredientId: getId(iMap, 'Broccoli'), grams: 150, displayQty: 1, displayUnit: 'tête', sortOrder: 4},
            {recipeId: r1.id, ingredientId: getId(iMap, 'Huile d\'olive'), grams: 15, displayQty: 1, displayUnit: 'cuillère à soupe', sortOrder: 2},
        ],
        skipDuplicates: true
    });

    await db.review.create({
        data: {userId: admin.id, recipeId: r1.id, rating: 5}
    });

    console.log("Seeding finished.");

}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await db.$disconnect();
    });
