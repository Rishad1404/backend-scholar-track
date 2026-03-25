// src/app/modules/review/review.service.ts

import status from "http-status";
import {
  ApplicationStatus,
  NotificationType,
} from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import AppError from "../../errorHelpers/AppError";
import { getApplicationForReview, getReviewer } from "./review.helper";

// ═══════════════════════════════════════════
// Helper: Calculate total score
// ═══════════════════════════════════════════
const calculateTotalScore = (scores: {
  gpaScore: number;
  essayScore: number;
  financialScore: number;
  criteriaScore: number;
}): number => {
  return (
    scores.gpaScore +
    scores.essayScore +
    scores.financialScore +
    scores.criteriaScore
  );
};


// ═══════════════════════════════════════════
// SUBMIT REVIEW
// ═══════════════════════════════════════════
const submitReview = async (
  userId: string,
  applicationId: string,
  payload: {
    gpaScore: number;
    essayScore: number;
    financialScore: number;
    criteriaScore: number;
    notes?: string;
  }
) => {
  const reviewer = await getReviewer(userId);
  const application = await getApplicationForReview(
    applicationId,
    reviewer.universityId
  );

  // ── Check if already reviewed by this reviewer ──
  const existingReview = await prisma.applicationReview.findFirst({
    where: {
      applicationId,
      reviewerId: reviewer.id,
      isDeleted: false,
    },
  });

  if (existingReview) {
    throw new AppError(
      status.CONFLICT,
      "You have already reviewed this application. Use update instead."
    );
  }

  const totalScore = calculateTotalScore(payload);

  const review = await prisma.applicationReview.create({
    data: {
      applicationId,
      reviewerId: reviewer.id,
      gpaScore: payload.gpaScore,
      essayScore: payload.essayScore,
      financialScore: payload.financialScore,
      criteriaScore: payload.criteriaScore,
      totalScore,
      notes: payload.notes,
    },
    include: {
      reviewer: {
        select: {
          id: true,
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      },
    },
  });

  // ── Notify student ──
  await prisma.notification.create({
    data: {
      userId: application.student.user.id,
      type: NotificationType.APPLICATION_UNDER_REVIEW,
      title: "Application Reviewed",
      message: `Your application for "${application.scholarship.title}" has been reviewed by a committee member.`,
      link: `/applications/${applicationId}`,
    },
  });

  // ── Notify university admin(s) that a review was submitted ──
  const admins = await prisma.admin.findMany({
    where: {
      universityId: reviewer.universityId,
      isDeleted: false,
    },
    select: { userId: true },
  });

  if (admins.length > 0) {
    await prisma.notification.createMany({
      data: admins.map((admin) => ({
        userId: admin.userId,
        type: NotificationType.APPLICATION_UNDER_REVIEW,
        title: "New Review Submitted",
        message: `A committee reviewer has submitted a review for an application for "${application.scholarship.title}". Score: ${totalScore}/40`,
        link: `/applications/${applicationId}`,
      })),
    });
  }

  return review;
};

// ═══════════════════════════════════════════
// UPDATE REVIEW
// ═══════════════════════════════════════════
const updateReview = async (
  userId: string,
  applicationId: string,
  payload: {
    gpaScore?: number;
    essayScore?: number;
    financialScore?: number;
    criteriaScore?: number;
    notes?: string;
  }
) => {
  const reviewer = await getReviewer(userId);

  // ── Validate application is still UNDER_REVIEW ──
  const application = await prisma.application.findFirst({
    where: {
      id: applicationId,
      isDeleted: false,
    },
  });

  if (!application) {
    throw new AppError(status.NOT_FOUND, "Application not found");
  }

  if (application.status !== ApplicationStatus.UNDER_REVIEW) {
    throw new AppError(
      status.BAD_REQUEST,
      `Cannot update review. Application status is "${application.status}". Only UNDER_REVIEW applications can have reviews updated.`
    );
  }

  // ── Find existing review ──
  const existingReview = await prisma.applicationReview.findFirst({
    where: {
      applicationId,
      reviewerId: reviewer.id,
      isDeleted: false,
    },
  });

  if (!existingReview) {
    throw new AppError(
      status.NOT_FOUND,
      "You have not reviewed this application yet"
    );
  }

  // ── Merge scores ──
  const updatedScores = {
    gpaScore: payload.gpaScore ?? existingReview.gpaScore,
    essayScore: payload.essayScore ?? existingReview.essayScore,
    financialScore:
      payload.financialScore ?? existingReview.financialScore,
    criteriaScore:
      payload.criteriaScore ?? existingReview.criteriaScore,
  };

  const totalScore = calculateTotalScore(updatedScores);

  const updatedReview = await prisma.applicationReview.update({
    where: { id: existingReview.id },
    data: {
      ...updatedScores,
      totalScore,
      ...(payload.notes !== undefined && { notes: payload.notes }),
    },
    include: {
      reviewer: {
        select: {
          id: true,
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      },
    },
  });

  return updatedReview;
};

// ═══════════════════════════════════════════
// GET REVIEWS FOR AN APPLICATION
// ═══════════════════════════════════════════
const getReviewsByApplicationId = async (
  userId: string,
  role: string,
  applicationId: string
) => {
  const application = await prisma.application.findFirst({
    where: {
      id: applicationId,
      isDeleted: false,
    },
    select: {
      id: true,
      universityId: true,
      status: true,
      scholarship: {
        select: {
          id: true,
          title: true,
          departmentId: true,
          universityId: true,
        },
      },
      student: {
        select: { userId: true },
      },
    },
  });

  if (!application) {
    throw new AppError(status.NOT_FOUND, "Application not found");
  }

  // ── Role-based access ──
  if (role === "STUDENT") {
    if (application.student.userId !== userId) {
      throw new AppError(
        status.FORBIDDEN,
        "You can only view reviews on your own applications"
      );
    }
  }

  if (role === "UNIVERSITY_ADMIN") {
    const admin = await prisma.admin.findFirst({
      where: { userId, isDeleted: false },
    });

    if (!admin || application.universityId !== admin.universityId) {
      throw new AppError(status.FORBIDDEN, "Access denied");
    }
  }

  if (role === "DEPARTMENT_HEAD") {
    const deptHead = await prisma.departmentHead.findFirst({
      where: { userId, isDeleted: false },
    });

    if (!deptHead || application.universityId !== deptHead.universityId) {
      throw new AppError(status.FORBIDDEN, "Access denied");
    }

    if (
      application.scholarship.departmentId &&
      application.scholarship.departmentId !== deptHead.departmentId
    ) {
      throw new AppError(status.FORBIDDEN, "Access denied");
    }
  }

  if (role === "COMMITTEE_REVIEWER") {
    const reviewer = await prisma.reviewer.findFirst({
      where: { userId, isDeleted: false },
    });

    if (!reviewer || application.universityId !== reviewer.universityId) {
      throw new AppError(status.FORBIDDEN, "Access denied");
    }
  }

  const reviews = await prisma.applicationReview.findMany({
    where: {
      applicationId,
      isDeleted: false,
    },
    include: {
      reviewer: {
        select: {
          id: true,
          expertise: true,
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      },
    },
    orderBy: { submittedAt: "desc" },
  });

  // Calculate average score
  const averageScore =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.totalScore, 0) /
        reviews.length
      : 0;

  return {
    applicationId,
    scholarshipTitle: application.scholarship.title,
    totalReviews: reviews.length,
    averageScore: Math.round(averageScore * 100) / 100,
    maxPossibleScore: 40,
    reviews,
  };
};

// ═══════════════════════════════════════════
// DELETE REVIEW (Reviewer only, own review)
// ═══════════════════════════════════════════
const deleteReview = async (
  userId: string,
  applicationId: string
) => {
  const reviewer = await getReviewer(userId);

  const application = await prisma.application.findFirst({
    where: {
      id: applicationId,
      isDeleted: false,
    },
  });

  if (!application) {
    throw new AppError(status.NOT_FOUND, "Application not found");
  }

  if (application.status !== ApplicationStatus.UNDER_REVIEW) {
    throw new AppError(
      status.BAD_REQUEST,
      "Cannot delete review after final decision has been made"
    );
  }

  const review = await prisma.applicationReview.findFirst({
    where: {
      applicationId,
      reviewerId: reviewer.id,
      isDeleted: false,
    },
  });

  if (!review) {
    throw new AppError(
      status.NOT_FOUND,
      "You have not reviewed this application"
    );
  }

  await prisma.applicationReview.update({
    where: { id: review.id },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
    },
  });

  return null;
};

export const ReviewService = {
  submitReview,
  updateReview,
  getReviewsByApplicationId,
  deleteReview,
};