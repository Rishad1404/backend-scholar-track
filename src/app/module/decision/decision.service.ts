// src/app/modules/decision/decision.service.ts

import status from "http-status";
import { ApplicationStatus, NotificationType } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import AppError from "../../errorHelpers/AppError";


// MAKE FINAL DECISION (Admin)
const makeDecision = async (
  userId: string,
  role: string,
  applicationId: string,
  payload: {
    decision: "APPROVED" | "REJECTED";
    remarks?: string;
  },
) => {
  // ── Get admin ──
  let universityId: string | null = null;

  if (role === "UNIVERSITY_ADMIN") {
    const admin = await prisma.admin.findFirst({
      where: { userId, isDeleted: false },
    });

    if (!admin) {
      throw new AppError(status.NOT_FOUND, "Admin profile not found");
    }

    universityId = admin.universityId;
  }

  // ── Find application with reviews ──
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
          quota: true,
          amountPerStudent: true,
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
      reviews: {
        where: { isDeleted: false },
        select: {
          id: true,
          totalScore: true,
        },
      },
    },
  });

  if (!application) {
    throw new AppError(status.NOT_FOUND, "Application not found");
  }

  // ── Status check ──
  if (application.status !== ApplicationStatus.UNDER_REVIEW) {
    throw new AppError(
      status.BAD_REQUEST,
      `Cannot make decision on application with status "${application.status}". Only UNDER_REVIEW applications can receive a final decision.`,
    );
  }

  // ── University match (for admin) ──
  if (universityId && application.scholarship.universityId !== universityId) {
    throw new AppError(
      status.FORBIDDEN,
      "You can only make decisions on applications from your own university",
    );
  }

  // ── Check if there are any reviews ──
  if (application.reviews.length === 0) {
    throw new AppError(
      status.BAD_REQUEST,
      "Cannot make a decision without any committee reviews. At least one review is required.",
    );
  }

  // ── If approving, check quota ──
  if (payload.decision === "APPROVED") {
    const approvedCount = await prisma.application.count({
      where: {
        scholarshipId: application.scholarship.id,
        status: {
          in: [ApplicationStatus.APPROVED, ApplicationStatus.DISBURSED],
        },
        isDeleted: false,
      },
    });

    if (approvedCount >= application.scholarship.quota) {
      throw new AppError(
        status.BAD_REQUEST,
        `Scholarship quota is full (${approvedCount}/${application.scholarship.quota}). Cannot approve more applications.`,
      );
    }
  }

  // ── Update application status ──
  const newStatus =
    payload.decision === "APPROVED"
      ? ApplicationStatus.APPROVED
      : ApplicationStatus.REJECTED;

  const updatedApplication = await prisma.application.update({
    where: { id: applicationId },
    data: { status: newStatus },
    include: {
      scholarship: {
        select: {
          id: true,
          title: true,
          amountPerStudent: true,
          department: { select: { id: true, name: true } },
          university: { select: { id: true, name: true } },
        },
      },
      student: {
        select: {
          id: true,
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      },
      reviews: {
        where: { isDeleted: false },
        select: {
          id: true,
          totalScore: true,
          reviewer: {
            select: {
              id: true,
              user: {
                select: { id: true, name: true },
              },
            },
          },
        },
      },
      screening: {
        select: {
          id: true,
          passed: true,
          comment: true,
        },
      },
    },
  });

  // ── Calculate review summary ──
  const avgScore =
    application.reviews.reduce((sum, r) => sum + r.totalScore, 0) /
    application.reviews.length;

  // ── Notify student ──
  await prisma.notification.create({
    data: {
      userId: application.student.user.id,
      type:
        payload.decision === "APPROVED"
          ? NotificationType.APPLICATION_APPROVED
          : NotificationType.APPLICATION_REJECTED,
      title:
        payload.decision === "APPROVED"
          ? "Application Approved!"
          : "Application Not Approved",
      message:
        payload.decision === "APPROVED"
          ? `Congratulations! Your application for "${application.scholarship.title}" has been approved. You will receive ${application.scholarship.amountPerStudent} as scholarship aid.`
          : `Your application for "${application.scholarship.title}" was not approved.${
              payload.remarks ? ` Reason: ${payload.remarks}` : ""
            }`,
      link: `/applications/${applicationId}`,
    },
  });

  return {
    application: updatedApplication,
    decision: {
      status: newStatus,
      remarks: payload.remarks || null,
      reviewSummary: {
        totalReviews: application.reviews.length,
        averageScore: Math.round(avgScore * 100) / 100,
        maxPossibleScore: 40,
      },
    },
  };
};

export const DecisionService = {
  makeDecision,
};
