/*
  Warnings:

  - Added the required column `title` to the `Segment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Segment" ADD COLUMN     "title" TEXT NOT NULL;
