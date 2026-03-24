/*
  Warnings:

  - You are about to drop the column `documentUrl` on the `scholarships` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "scholarships" DROP COLUMN "documentUrl",
ADD COLUMN     "document" TEXT;
