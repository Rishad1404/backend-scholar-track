/*
  Warnings:

  - Added the required column `email` to the `admins` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `admins` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "admins" ADD COLUMN     "email" VARCHAR(255) NOT NULL,
ADD COLUMN     "name" VARCHAR(255) NOT NULL,
ADD COLUMN     "profilePhoto" VARCHAR(500);

-- CreateIndex
CREATE INDEX "idx_admin_email" ON "admins"("email");

-- RenameIndex
ALTER INDEX "idx_admin_profile_isDeleted" RENAME TO "idx_admin_isDeleted";

-- RenameIndex
ALTER INDEX "idx_admin_profile_universityId" RENAME TO "idx_admin_universityId";
