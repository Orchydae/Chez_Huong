-- AlterTable
ALTER TABLE "RecipeIngredient" DROP CONSTRAINT "RecipeIngredient_pkey",
ADD COLUMN     "displayName" TEXT,
ADD COLUMN     "id" SERIAL NOT NULL,
ADD COLUMN     "recipeRefId" INTEGER,
ALTER COLUMN "ingredientId" DROP NOT NULL,
ADD CONSTRAINT "RecipeIngredient_pkey" PRIMARY KEY ("id");

-- AddForeignKey
ALTER TABLE "RecipeIngredient" ADD CONSTRAINT "RecipeIngredient_recipeRefId_fkey" FOREIGN KEY ("recipeRefId") REFERENCES "Recipe"("id") ON DELETE SET NULL ON UPDATE CASCADE;
