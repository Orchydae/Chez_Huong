-- CreateEnum
CREATE TYPE "RecipeStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "RecipeLinkKind" AS ENUM ('PAIRS_WITH', 'USES', 'VARIATION_OF');

-- AlterTable
ALTER TABLE "Recipe" ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "slug" TEXT NOT NULL,
ADD COLUMN     "status" "RecipeStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "yield" TEXT;

-- DropTable
DROP TABLE IF EXISTS "AuditLog";

-- CreateTable
CREATE TABLE "RecipeLink" (
    "id" SERIAL NOT NULL,
    "fromId" INTEGER NOT NULL,
    "toId" INTEGER NOT NULL,
    "kind" "RecipeLinkKind" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecipeLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecipeLink_toId_idx" ON "RecipeLink"("toId");

-- CreateIndex
CREATE UNIQUE INDEX "RecipeLink_fromId_toId_kind_key" ON "RecipeLink"("fromId", "toId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "Recipe_slug_key" ON "Recipe"("slug");

-- AddForeignKey
ALTER TABLE "RecipeLink" ADD CONSTRAINT "RecipeLink_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeLink" ADD CONSTRAINT "RecipeLink_toId_fkey" FOREIGN KEY ("toId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
