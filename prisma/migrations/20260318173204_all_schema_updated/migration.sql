/*
  Warnings:

  - You are about to drop the column `deletedAt` on the `disbursements` table. All the data in the column will be lost.
  - You are about to drop the column `isDeleted` on the `disbursements` table. All the data in the column will be lost.
  - You are about to drop the column `processedAt` on the `disbursements` table. All the data in the column will be lost.
  - You are about to drop the column `stripeAccountId` on the `disbursements` table. All the data in the column will be lost.
  - You are about to drop the column `isApproved` on the `universities` table. All the data in the column will be lost.
  - You are about to drop the column `isSuspended` on the `universities` table. All the data in the column will be lost.
  - You are about to drop the `payments` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[stripePayoutId]` on the table `disbursements` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `approvedById` to the `disbursements` table without a default value. This is not possible if the table is not empty.
  - Added the required column `scholarshipId` to the `disbursements` table without a default value. This is not possible if the table is not empty.
  - Added the required column `studentId` to the `disbursements` table without a default value. This is not possible if the table is not empty.
  - Added the required column `universityId` to the `disbursements` table without a default value. This is not possible if the table is not empty.
  - Added the required column `deadline` to the `scholarships` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('INACTIVE', 'ACTIVE', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "SubscriptionPaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "UniversityStatus" AS ENUM ('PENDING', 'APPROVED', 'SUSPENDED');

-- DropForeignKey
ALTER TABLE "admins" DROP CONSTRAINT "admins_universityId_fkey";

-- DropForeignKey
ALTER TABLE "admins" DROP CONSTRAINT "admins_userId_fkey";

-- DropForeignKey
ALTER TABLE "application_documents" DROP CONSTRAINT "application_documents_applicationId_fkey";

-- DropForeignKey
ALTER TABLE "application_reviews" DROP CONSTRAINT "application_reviews_applicationId_fkey";

-- DropForeignKey
ALTER TABLE "application_reviews" DROP CONSTRAINT "application_reviews_reviewerId_fkey";

-- DropForeignKey
ALTER TABLE "application_screenings" DROP CONSTRAINT "application_screenings_applicationId_fkey";

-- DropForeignKey
ALTER TABLE "application_screenings" DROP CONSTRAINT "application_screenings_reviewerId_fkey";

-- DropForeignKey
ALTER TABLE "applications" DROP CONSTRAINT "applications_scholarshipId_fkey";

-- DropForeignKey
ALTER TABLE "applications" DROP CONSTRAINT "applications_studentId_fkey";

-- DropForeignKey
ALTER TABLE "applications" DROP CONSTRAINT "applications_universityId_fkey";

-- DropForeignKey
ALTER TABLE "department_heads" DROP CONSTRAINT "department_heads_departmentId_fkey";

-- DropForeignKey
ALTER TABLE "department_heads" DROP CONSTRAINT "department_heads_universityId_fkey";

-- DropForeignKey
ALTER TABLE "department_heads" DROP CONSTRAINT "department_heads_userId_fkey";

-- DropForeignKey
ALTER TABLE "departments" DROP CONSTRAINT "departments_universityId_fkey";

-- DropForeignKey
ALTER TABLE "disbursements" DROP CONSTRAINT "disbursements_applicationId_fkey";

-- DropForeignKey
ALTER TABLE "invites" DROP CONSTRAINT "invites_departmentId_fkey";

-- DropForeignKey
ALTER TABLE "invites" DROP CONSTRAINT "invites_invitedByUserId_fkey";

-- DropForeignKey
ALTER TABLE "invites" DROP CONSTRAINT "invites_universityId_fkey";

-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_userId_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_applicationId_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_scholarshipId_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_universityId_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_userId_fkey";

-- DropForeignKey
ALTER TABLE "reviewers" DROP CONSTRAINT "reviewers_universityId_fkey";

-- DropForeignKey
ALTER TABLE "reviewers" DROP CONSTRAINT "reviewers_userId_fkey";

-- DropForeignKey
ALTER TABLE "scholarships" DROP CONSTRAINT "scholarships_departmentId_fkey";

-- DropForeignKey
ALTER TABLE "scholarships" DROP CONSTRAINT "scholarships_levelId_fkey";

-- DropForeignKey
ALTER TABLE "scholarships" DROP CONSTRAINT "scholarships_universityId_fkey";

-- DropForeignKey
ALTER TABLE "student_academic_info" DROP CONSTRAINT "student_academic_info_departmentId_fkey";

-- DropForeignKey
ALTER TABLE "student_academic_info" DROP CONSTRAINT "student_academic_info_levelId_fkey";

-- DropForeignKey
ALTER TABLE "student_academic_info" DROP CONSTRAINT "student_academic_info_studentId_fkey";

-- DropForeignKey
ALTER TABLE "student_academic_info" DROP CONSTRAINT "student_academic_info_termId_fkey";

-- DropIndex
DROP INDEX "idx_disbursement_isDeleted";

-- AlterTable
ALTER TABLE "admins" ADD COLUMN     "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'INACTIVE',
ALTER COLUMN "userId" SET DATA TYPE TEXT,
ALTER COLUMN "universityId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "application_documents" ALTER COLUMN "applicationId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "application_reviews" ALTER COLUMN "applicationId" SET DATA TYPE TEXT,
ALTER COLUMN "reviewerId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "application_screenings" ALTER COLUMN "applicationId" SET DATA TYPE TEXT,
ALTER COLUMN "reviewerId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "department_heads" ALTER COLUMN "userId" SET DATA TYPE TEXT,
ALTER COLUMN "universityId" SET DATA TYPE TEXT,
ALTER COLUMN "departmentId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "departments" ALTER COLUMN "universityId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "disbursements" DROP COLUMN "deletedAt",
DROP COLUMN "isDeleted",
DROP COLUMN "processedAt",
DROP COLUMN "stripeAccountId",
ADD COLUMN     "approvedById" TEXT NOT NULL,
ADD COLUMN     "currency" VARCHAR(10) NOT NULL DEFAULT 'BDT',
ADD COLUMN     "disbursedAt" TIMESTAMP(3),
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "platformFee" DOUBLE PRECISION,
ADD COLUMN     "scholarshipId" TEXT NOT NULL,
ADD COLUMN     "stripePayoutId" TEXT,
ADD COLUMN     "studentId" TEXT NOT NULL,
ADD COLUMN     "universityId" TEXT NOT NULL,
ALTER COLUMN "applicationId" SET DATA TYPE TEXT,
ALTER COLUMN "stripeTransferId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "invites" ALTER COLUMN "universityId" SET DATA TYPE TEXT,
ALTER COLUMN "invitedByUserId" SET DATA TYPE TEXT,
ALTER COLUMN "departmentId" SET DATA TYPE TEXT,
ALTER COLUMN "token" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "notifications" ALTER COLUMN "userId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "reviewers" ALTER COLUMN "userId" SET DATA TYPE TEXT,
ALTER COLUMN "universityId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "scholarships" ADD COLUMN     "deadline" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "requiredDocTypes" "DocumentType"[],
ALTER COLUMN "universityId" SET DATA TYPE TEXT,
ALTER COLUMN "departmentId" SET DATA TYPE TEXT,
ALTER COLUMN "levelId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "student_academic_info" ADD COLUMN     "studentIdNo" VARCHAR(100),
ALTER COLUMN "studentId" SET DATA TYPE TEXT,
ALTER COLUMN "departmentId" SET DATA TYPE TEXT,
ALTER COLUMN "levelId" SET DATA TYPE TEXT,
ALTER COLUMN "termId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "universities" DROP COLUMN "isApproved",
DROP COLUMN "isSuspended",
ADD COLUMN     "status" "UniversityStatus" NOT NULL DEFAULT 'PENDING',
ALTER COLUMN "logoUrl" SET DATA TYPE TEXT,
ALTER COLUMN "logoPublicId" SET DATA TYPE TEXT,
ALTER COLUMN "stripeCustomerId" SET DATA TYPE TEXT,
ALTER COLUMN "subscriptionId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "email" SET DATA TYPE TEXT,
ALTER COLUMN "image" SET DATA TYPE TEXT;

-- DropTable
DROP TABLE "payments";

-- DropEnum
DROP TYPE "PaymentStatus";

-- DropEnum
DROP TYPE "PaymentType";

-- CreateTable
CREATE TABLE "subscription_payments" (
    "id" TEXT NOT NULL,
    "universityId" VARCHAR(36) NOT NULL,
    "adminId" VARCHAR(36) NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'BDT',
    "status" "SubscriptionPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "stripeInvoiceId" VARCHAR(100),
    "stripePaymentId" VARCHAR(100),
    "stripeCustomerId" VARCHAR(100),
    "paidAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscription_payments_stripeInvoiceId_key" ON "subscription_payments"("stripeInvoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_payments_stripePaymentId_key" ON "subscription_payments"("stripePaymentId");

-- CreateIndex
CREATE INDEX "idx_sub_payment_universityId" ON "subscription_payments"("universityId");

-- CreateIndex
CREATE INDEX "idx_sub_payment_adminId" ON "subscription_payments"("adminId");

-- CreateIndex
CREATE INDEX "idx_sub_payment_status" ON "subscription_payments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "disbursements_stripePayoutId_key" ON "disbursements"("stripePayoutId");

-- CreateIndex
CREATE INDEX "idx_disbursement_studentId" ON "disbursements"("studentId");

-- CreateIndex
CREATE INDEX "idx_disbursement_universityId" ON "disbursements"("universityId");

-- AddForeignKey
ALTER TABLE "admins" ADD CONSTRAINT "admins_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admins" ADD CONSTRAINT "admins_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "universities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_scholarshipId_fkey" FOREIGN KEY ("scholarshipId") REFERENCES "scholarships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "universities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_documents" ADD CONSTRAINT "application_documents_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_reviews" ADD CONSTRAINT "application_reviews_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_reviews" ADD CONSTRAINT "application_reviews_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "reviewers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_screenings" ADD CONSTRAINT "application_screenings_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_screenings" ADD CONSTRAINT "application_screenings_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "department_heads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "universities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "department_heads" ADD CONSTRAINT "department_heads_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "department_heads" ADD CONSTRAINT "department_heads_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "universities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "department_heads" ADD CONSTRAINT "department_heads_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disbursements" ADD CONSTRAINT "disbursements_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disbursements" ADD CONSTRAINT "disbursements_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disbursements" ADD CONSTRAINT "disbursements_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disbursements" ADD CONSTRAINT "disbursements_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "universities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disbursements" ADD CONSTRAINT "disbursements_scholarshipId_fkey" FOREIGN KEY ("scholarshipId") REFERENCES "scholarships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invites" ADD CONSTRAINT "invites_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "universities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invites" ADD CONSTRAINT "invites_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invites" ADD CONSTRAINT "invites_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviewers" ADD CONSTRAINT "reviewers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviewers" ADD CONSTRAINT "reviewers_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "universities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scholarships" ADD CONSTRAINT "scholarships_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "universities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scholarships" ADD CONSTRAINT "scholarships_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scholarships" ADD CONSTRAINT "scholarships_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "academic_levels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_academic_info" ADD CONSTRAINT "student_academic_info_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_academic_info" ADD CONSTRAINT "student_academic_info_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_academic_info" ADD CONSTRAINT "student_academic_info_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "academic_levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_academic_info" ADD CONSTRAINT "student_academic_info_termId_fkey" FOREIGN KEY ("termId") REFERENCES "academic_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "universities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
