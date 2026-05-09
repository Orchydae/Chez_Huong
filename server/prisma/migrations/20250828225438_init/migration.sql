-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('VISITOR', 'EDITOR', 'MODERATOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "public"."Difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "public"."IngredientSource" AS ENUM ('LOCAL', 'USDA');

-- CreateEnum
CREATE TYPE "public"."NutrientUnit" AS ENUM ('KCAL', 'G', 'MG', 'UG', 'IU');

-- CreateEnum
CREATE TYPE "public"."NutrientBasis" AS ENUM ('PER_100G', 'PER_SERVING');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL DEFAULT 'VISITOR',

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Review" (
    "rating" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "recipeId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("userId","recipeId")
);

-- CreateTable
CREATE TABLE "public"."Comment" (
    "id" SERIAL NOT NULL,
    "recipeId" INTEGER NOT NULL,
    "parentId" INTEGER,
    "userId" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Particularity" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Particularity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ParticularityRecipe" (
    "recipeId" INTEGER NOT NULL,
    "particularityId" INTEGER NOT NULL,

    CONSTRAINT "ParticularityRecipe_pkey" PRIMARY KEY ("particularityId","recipeId")
);

-- CreateTable
CREATE TABLE "public"."Recipe" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "difficulty" "public"."Difficulty" NOT NULL DEFAULT 'MEDIUM',
    "prepTime" INTEGER NOT NULL,
    "cookTime" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "authorId" TEXT NOT NULL,

    CONSTRAINT "Recipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CategoryRecipe" (
    "categoryId" INTEGER NOT NULL,
    "recipeId" INTEGER NOT NULL,

    CONSTRAINT "CategoryRecipe_pkey" PRIMARY KEY ("categoryId","recipeId")
);

-- CreateTable
CREATE TABLE "public"."Category" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Segment" (
    "id" SERIAL NOT NULL,
    "recipeId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,

    CONSTRAINT "Segment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InstructionStep" (
    "id" SERIAL NOT NULL,
    "segmentId" INTEGER NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "media" TEXT,
    "mediaAlt" TEXT,

    CONSTRAINT "InstructionStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Ingredient" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "source" "public"."IngredientSource" NOT NULL DEFAULT 'LOCAL',
    "fdcId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ingredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."IngredientInstance" (
    "id" SERIAL NOT NULL,
    "ingredientId" INTEGER NOT NULL,
    "recipeId" INTEGER NOT NULL,
    "grams" DECIMAL(10,3),
    "displayQty" DECIMAL(10,3),
    "displayUnit" TEXT,
    "note" TEXT,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "segmentId" INTEGER,

    CONSTRAINT "IngredientInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."NutrientValue" (
    "ingredientId" INTEGER NOT NULL,
    "nutrientId" INTEGER NOT NULL,
    "amount" DECIMAL(10,3) NOT NULL,
    "basis" "public"."NutrientBasis" NOT NULL DEFAULT 'PER_100G',

    CONSTRAINT "NutrientValue_pkey" PRIMARY KEY ("ingredientId","nutrientId")
);

-- CreateTable
CREATE TABLE "public"."Nutrient" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,

    CONSTRAINT "Nutrient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_UserFavorites" (
    "A" INTEGER NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_UserFavorites_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "Review_recipeId_idx" ON "public"."Review"("recipeId");

-- CreateIndex
CREATE INDEX "Review_userId_idx" ON "public"."Review"("userId");

-- CreateIndex
CREATE INDEX "Comment_parentId_idx" ON "public"."Comment"("parentId");

-- CreateIndex
CREATE INDEX "Comment_recipeId_idx" ON "public"."Comment"("recipeId");

-- CreateIndex
CREATE INDEX "Comment_userId_idx" ON "public"."Comment"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Particularity_name_key" ON "public"."Particularity"("name");

-- CreateIndex
CREATE INDEX "ParticularityRecipe_recipeId_idx" ON "public"."ParticularityRecipe"("recipeId");

-- CreateIndex
CREATE INDEX "Recipe_authorId_idx" ON "public"."Recipe"("authorId");

-- CreateIndex
CREATE INDEX "Recipe_createdAt_idx" ON "public"."Recipe"("createdAt");

-- CreateIndex
CREATE INDEX "CategoryRecipe_recipeId_idx" ON "public"."CategoryRecipe"("recipeId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "public"."Category"("name");

-- CreateIndex
CREATE INDEX "InstructionStep_segmentId_idx" ON "public"."InstructionStep"("segmentId");

-- CreateIndex
CREATE UNIQUE INDEX "InstructionStep_segmentId_stepNumber_key" ON "public"."InstructionStep"("segmentId", "stepNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Ingredient_name_key" ON "public"."Ingredient"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Ingredient_fdcId_key" ON "public"."Ingredient"("fdcId");

-- CreateIndex
CREATE INDEX "IngredientInstance_recipeId_idx" ON "public"."IngredientInstance"("recipeId");

-- CreateIndex
CREATE INDEX "IngredientInstance_ingredientId_idx" ON "public"."IngredientInstance"("ingredientId");

-- CreateIndex
CREATE INDEX "NutrientValue_ingredientId_idx" ON "public"."NutrientValue"("ingredientId");

-- CreateIndex
CREATE UNIQUE INDEX "Nutrient_name_key" ON "public"."Nutrient"("name");

-- CreateIndex
CREATE INDEX "_UserFavorites_B_index" ON "public"."_UserFavorites"("B");

-- AddForeignKey
ALTER TABLE "public"."Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Review" ADD CONSTRAINT "Review_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "public"."Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Comment" ADD CONSTRAINT "Comment_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "public"."Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Comment" ADD CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Comment" ADD CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."Comment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ParticularityRecipe" ADD CONSTRAINT "ParticularityRecipe_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "public"."Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ParticularityRecipe" ADD CONSTRAINT "ParticularityRecipe_particularityId_fkey" FOREIGN KEY ("particularityId") REFERENCES "public"."Particularity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Recipe" ADD CONSTRAINT "Recipe_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CategoryRecipe" ADD CONSTRAINT "CategoryRecipe_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "public"."Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CategoryRecipe" ADD CONSTRAINT "CategoryRecipe_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Segment" ADD CONSTRAINT "Segment_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "public"."Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InstructionStep" ADD CONSTRAINT "InstructionStep_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "public"."Segment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."IngredientInstance" ADD CONSTRAINT "IngredientInstance_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "public"."Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."IngredientInstance" ADD CONSTRAINT "IngredientInstance_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "public"."Ingredient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NutrientValue" ADD CONSTRAINT "NutrientValue_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "public"."Ingredient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NutrientValue" ADD CONSTRAINT "NutrientValue_nutrientId_fkey" FOREIGN KEY ("nutrientId") REFERENCES "public"."Nutrient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_UserFavorites" ADD CONSTRAINT "_UserFavorites_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_UserFavorites" ADD CONSTRAINT "_UserFavorites_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
