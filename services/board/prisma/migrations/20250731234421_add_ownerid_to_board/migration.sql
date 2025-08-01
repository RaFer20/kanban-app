/*
  Warnings:

  - A unique constraint covering the columns `[name,ownerId]` on the table `Board` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `ownerId` to the `Board` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Board_name_key";

-- AlterTable
ALTER TABLE "Board" ADD COLUMN     "ownerId" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Board_name_ownerId_key" ON "Board"("name", "ownerId");
