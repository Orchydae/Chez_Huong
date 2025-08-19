/*
  Warnings:

  - The primary key for the `CategoryRecipe` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `CategoryRecipe` table. All the data in the column will be lost.
  - The primary key for the `IngredientNutrient` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `IngredientNutrient` table. All the data in the column will be lost.
  - The primary key for the `ParticularityRecipe` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `ParticularityRecipe` table. All the data in the column will be lost.
  - The primary key for the `Review` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `Review` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[name]` on the table `Category` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `Ingredient` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[segmentId,stepNumber]` on the table `InstructionStep` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `Nutrient` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `Particularity` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `Comment` table without a default value. This is not possible if the table is not empty.
  - Made the column `amountPer100g` on table `IngredientNutrient` required. This step will fail if there are existing NULL values in that column.
  - Made the column `unit` on table `Nutrient` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `updatedAt` to the `Review` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."Review" DROP CONSTRAINT "Review_recipeId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Review" DROP CONSTRAINT "Review_userId_fkey";

-- AlterTable
ALTER TABLE "public"."Review" ADD CONSTRAINT "rating_check" CHECK (rating >= 1 AND rating <= 5);

-- AlterTable
ALTER TABLE "public"."CategoryRecipe" DROP CONSTRAINT "CategoryRecipe_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "CategoryRecipe_pkey" PRIMARY KEY ("categoryId", "recipeId");

-- AlterTable
ALTER TABLE "public"."Comment" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "public"."IngredientNutrient" DROP CONSTRAINT "IngredientNutrient_pkey",
DROP COLUMN "id",
ALTER COLUMN "amountPer100g" SET NOT NULL,
ADD CONSTRAINT "IngredientNutrient_pkey" PRIMARY KEY ("ingredientId", "nutrientId");

-- AlterTable
ALTER TABLE "public"."InstructionStep" ADD COLUMN     "mediaAlt" TEXT;

-- AlterTable
ALTER TABLE "public"."Nutrient" ALTER COLUMN "unit" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."ParticularityRecipe" DROP CONSTRAINT "ParticularityRecipe_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "ParticularityRecipe_pkey" PRIMARY KEY ("particularityId", "recipeId");

-- AlterTable
ALTER TABLE "public"."Review" DROP CONSTRAINT "Review_pkey",
DROP COLUMN "id",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD CONSTRAINT "Review_pkey" PRIMARY KEY ("userId", "recipeId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "public"."Category"("name");

-- CreateIndex
CREATE INDEX "Comment_parentId_idx" ON "public"."Comment"("parentId");

-- CreateIndex
CREATE INDEX "Comment_recipeId_idx" ON "public"."Comment"("recipeId");

-- CreateIndex
CREATE INDEX "Comment_userId_idx" ON "public"."Comment"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Ingredient_name_key" ON "public"."Ingredient"("name");

-- CreateIndex
CREATE INDEX "IngredientInstance_recipeId_idx" ON "public"."IngredientInstance"("recipeId");

-- CreateIndex
CREATE INDEX "IngredientInstance_ingredientId_idx" ON "public"."IngredientInstance"("ingredientId");

-- CreateIndex
CREATE INDEX "InstructionStep_segmentId_idx" ON "public"."InstructionStep"("segmentId");

-- CreateIndex
CREATE UNIQUE INDEX "InstructionStep_segmentId_stepNumber_key" ON "public"."InstructionStep"("segmentId", "stepNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Nutrient_name_key" ON "public"."Nutrient"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Particularity_name_key" ON "public"."Particularity"("name");

-- CreateIndex
CREATE INDEX "Recipe_authorId_idx" ON "public"."Recipe"("authorId");

-- CreateIndex
CREATE INDEX "Recipe_createdAt_idx" ON "public"."Recipe"("createdAt");

-- CreateIndex
CREATE INDEX "Review_recipeId_idx" ON "public"."Review"("recipeId");

-- CreateIndex
CREATE INDEX "Review_userId_idx" ON "public"."Review"("userId");

-- AddForeignKey
ALTER TABLE "public"."Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Review" ADD CONSTRAINT "Review_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "public"."Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
