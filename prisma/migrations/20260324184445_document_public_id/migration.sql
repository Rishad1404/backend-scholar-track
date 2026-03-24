/*
  Warnings:

  - You are about to alter the column `document` on the `scholarships` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.

*/
-- AlterTable
ALTER TABLE "scholarships" ADD COLUMN     "documentPublicId" VARCHAR(255),
ALTER COLUMN "document" SET DATA TYPE VARCHAR(255);
