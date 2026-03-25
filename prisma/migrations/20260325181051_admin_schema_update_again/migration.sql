/*
  Warnings:

  - Made the column `universityId` on table `admins` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "admins" ALTER COLUMN "universityId" SET NOT NULL;
