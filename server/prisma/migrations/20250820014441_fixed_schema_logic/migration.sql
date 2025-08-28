/*
  Warnings:

  - You are about to drop the column `unit` on the `Ingredient` table. All the data in the column will be lost.
  - You are about to drop the column `quantity` on the `IngredientInstance` table. All the data in the column will be lost.
  - You are about to drop the column `unit` on the `IngredientInstance` table. All the data in the column will be lost.
  - You are about to alter the column `grams` on the `IngredientInstance` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(10,3)`.
  - You are about to drop the column `usdaId` on the `Nutrient` table. All the data in the column will be lost.
  - You are about to drop the `IngredientNutrient` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `grams` on table `IngredientInstance` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "public"."NutrientUnit" AS ENUM ('KCAL', 'G', 'MG', 'UG', 'IU');

-- CreateEnum
CREATE TYPE "public"."NutrientBasis" AS ENUM ('PER_100G', 'PER_SERVING');

-- DropForeignKey
ALTER TABLE "public"."CategoryRecipe" DROP CONSTRAINT "CategoryRecipe_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "public"."CategoryRecipe" DROP CONSTRAINT "CategoryRecipe_recipeId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Comment" DROP CONSTRAINT "Comment_recipeId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Comment" DROP CONSTRAINT "Comment_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."IngredientInstance" DROP CONSTRAINT "IngredientInstance_ingredientId_fkey";

-- DropForeignKey
ALTER TABLE "public"."IngredientInstance" DROP CONSTRAINT "IngredientInstance_recipeId_fkey";

-- DropForeignKey
ALTER TABLE "public"."IngredientNutrient" DROP CONSTRAINT "IngredientNutrient_ingredientId_fkey";

-- DropForeignKey
ALTER TABLE "public"."IngredientNutrient" DROP CONSTRAINT "IngredientNutrient_nutrientId_fkey";

-- DropForeignKey
ALTER TABLE "public"."InstructionStep" DROP CONSTRAINT "InstructionStep_segmentId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ParticularityRecipe" DROP CONSTRAINT "ParticularityRecipe_particularityId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ParticularityRecipe" DROP CONSTRAINT "ParticularityRecipe_recipeId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Segment" DROP CONSTRAINT "Segment_recipeId_fkey";

-- DropIndex
DROP INDEX "public"."Nutrient_usdaId_key";

-- AlterTable
ALTER TABLE "public"."Comment" ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."Ingredient" DROP COLUMN "unit";

-- AlterTable
ALTER TABLE "public"."IngredientInstance" DROP COLUMN "quantity",
DROP COLUMN "unit",
ADD COLUMN     "displayQty" DECIMAL(10,3),
ADD COLUMN     "displayUnit" TEXT,
ADD COLUMN     "isOptional" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "note" TEXT,
ADD COLUMN     "segmentId" INTEGER,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "grams" SET NOT NULL,
ALTER COLUMN "grams" SET DATA TYPE DECIMAL(10,3);

-- AlterTable
ALTER TABLE "public"."Nutrient" DROP COLUMN "usdaId";

-- DropTable
DROP TABLE "public"."IngredientNutrient";

-- CreateTable
CREATE TABLE "public"."NutrientValue" (
    "ingredientId" INTEGER NOT NULL,
    "nutrientId" INTEGER NOT NULL,
    "amount" DECIMAL(10,3) NOT NULL,
    "basis" "public"."NutrientBasis" NOT NULL DEFAULT 'PER_100G',

    CONSTRAINT "NutrientValue_pkey" PRIMARY KEY ("ingredientId","nutrientId")
);

-- CreateIndex
CREATE INDEX "NutrientValue_ingredientId_idx" ON "public"."NutrientValue"("ingredientId");

-- CreateIndex
CREATE INDEX "CategoryRecipe_recipeId_idx" ON "public"."CategoryRecipe"("recipeId");

-- CreateIndex
CREATE INDEX "ParticularityRecipe_recipeId_idx" ON "public"."ParticularityRecipe"("recipeId");

-- AddForeignKey
ALTER TABLE "public"."Comment" ADD CONSTRAINT "Comment_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "public"."Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Comment" ADD CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ParticularityRecipe" ADD CONSTRAINT "ParticularityRecipe_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "public"."Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ParticularityRecipe" ADD CONSTRAINT "ParticularityRecipe_particularityId_fkey" FOREIGN KEY ("particularityId") REFERENCES "public"."Particularity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
