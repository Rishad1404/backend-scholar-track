// Helper: Get reviewer with validation

import status from "http-status";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { ApplicationStatus } from "../../../generated/prisma/enums";

// ═══════════════════════════════════════════
export const getReviewer = async (userId: string) => {
  const reviewer = await prisma.reviewer.findFirst({
    where: { userId, isDeleted: false },
  });

  if (!reviewer) {
    throw new AppError(status.NOT_FOUND, "Reviewer profile not found");
  }

  return reviewer;
};


// Helper: Get & validate application for review
export const getApplicationForReview = async (
  applicationId: string,
  reviewerUniversityId: string
) => {
  const application = await prisma.application.findFirst({
    where: {
      id: applicationId,
      isDeleted: false,
    },
    include: {
      scholarship: {
        select: {
          id: true,
          title: true,
          universityId: true,
          departmentId: true,
          department: { select: { id: true, name: true } },
          university: { select: { id: true, name: true } },
        },
      },
      student: {
        select: {
          id: true,
          userId: true,
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      },
    },
  });

  if (!application) {
    throw new AppError(status.NOT_FOUND, "Application not found");
  }

  if (application.status !== ApplicationStatus.UNDER_REVIEW) {
    throw new AppError(
      status.BAD_REQUEST,
      `Cannot review application with status "${application.status}". Only UNDER_REVIEW applications can be reviewed.`
    );
  }

  if (application.scholarship.universityId !== reviewerUniversityId) {
    throw new AppError(
      status.FORBIDDEN,
      "You can only review applications from your own university"
    );
  }

  return application;
};