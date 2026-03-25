// src/app/modules/screening/screening.service.ts

import status from "http-status";
import { ApplicationStatus, NotificationType } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import AppError from "../../errorHelpers/AppError";

// SCREEN APPLICATION (Dept Head)
const screenApplication = async (
  userId: string,
  applicationId: string,
  payload: { passed: boolean; comment?: string },
) => {
  // ── Find department head ──
  const deptHead = await prisma.departmentHead.findFirst({
    where: { userId, isDeleted: false },
  });

  if (!deptHead) {
    throw new AppError(status.NOT_FOUND, "Department Head profile not found");
  }

  // ── Find application ──
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
          departmentId: true,
          universityId: true,
        },
      },
      student: {
        select: {
          id: true,
          userId: true,
        },
      },
      screening: true,
    },
  });

  if (!application) {
    throw new AppError(status.NOT_FOUND, "Application not found");
  }

  // ── Status check ──
  if (application.status !== ApplicationStatus.SCREENING) {
    throw new AppError(
      status.BAD_REQUEST,
      `Cannot screen application with status "${application.status}". Only SCREENING applications can be screened.`,
    );
  }

  // ── Already screened check ──
  if (application.screening) {
    throw new AppError(status.CONFLICT, "This application has already been screened");
  }

  // ── University match ──
  if (application.scholarship.universityId !== deptHead.universityId) {
    throw new AppError(
      status.FORBIDDEN,
      "You can only screen applications from your own university",
    );
  }

  // ── Department match ──
  if (application.scholarship.departmentId !== deptHead.departmentId) {
    throw new AppError(
      status.FORBIDDEN,
      "You can only screen applications for your own department's scholarships",
    );
  }

  // ── Determine new status ──
  const newStatus = payload.passed
    ? ApplicationStatus.UNDER_REVIEW
    : ApplicationStatus.REJECTED;

  // ── Create screening + update application in transaction ──
  const result = await prisma.$transaction(async (tx) => {
    // Create screening record
    const screening = await tx.applicationScreening.create({
      data: {
        applicationId,
        reviewerId: deptHead.id,
        passed: payload.passed,
        comment: payload.comment,
      },
      include: {
        departmentHead: {
          select: {
            id: true,
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    // Update application status
    const updatedApplication = await tx.application.update({
      where: { id: applicationId },
      data: { status: newStatus },
      include: {
        scholarship: {
          select: {
            id: true,
            title: true,
            departmentId: true,
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
      },
    });

    return { screening, application: updatedApplication };
  });

  const scholarshipTitle = result.application.scholarship.title;

  // ── Notify student ──
  await prisma.notification.create({
    data: {
      userId: result.application.student.user.id,
      type: payload.passed
        ? NotificationType.APPLICATION_SCREENING_PASSED
        : NotificationType.APPLICATION_SCREENING_REJECTED,
      title: payload.passed
        ? "Application Screening Passed"
        : "Application Screening Rejected",
      message: payload.passed
        ? `Your application for "${scholarshipTitle}" has passed department screening and is now under committee review.`
        : `Your application for "${scholarshipTitle}" has been rejected during department screening.${
            payload.comment ? ` Reason: ${payload.comment}` : ""
          }`,
      link: `/applications/${applicationId}`,
    },
  });

  // ── If passed, notify committee reviewers ──
  if (payload.passed) {
    const reviewers = await prisma.reviewer.findMany({
      where: {
        universityId: deptHead.universityId,
        isDeleted: false,
      },
      select: { userId: true },
    });

    if (reviewers.length > 0) {
      await prisma.notification.createMany({
        data: reviewers.map((r) => ({
          userId: r.userId,
          type: NotificationType.APPLICATION_UNDER_REVIEW,
          title: "New Application for Review",
          message: `An application for "${scholarshipTitle}" has passed screening and requires your review.`,
          link: `/applications/${applicationId}`,
        })),
      });
    }
  }

  return result;
};

// ═══════════════════════════════════════════
// GET SCREENING RESULT
// ═══════════════════════════════════════════
const getScreeningByApplicationId = async (
  userId: string,
  role: string,
  applicationId: string,
) => {
  const application = await prisma.application.findFirst({
    where: {
      id: applicationId,
      isDeleted: false,
    },
    select: {
      id: true,
      universityId: true,
      scholarship: {
        select: { departmentId: true, universityId: true },
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
        "You can only view your own application screening",
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

    if (!deptHead) {
      throw new AppError(status.NOT_FOUND, "Department Head profile not found");
    }

    if (
      application.scholarship.departmentId !== deptHead.departmentId ||
      application.universityId !== deptHead.universityId
    ) {
      throw new AppError(status.FORBIDDEN, "Access denied");
    }
  }

  const screening = await prisma.applicationScreening.findFirst({
    where: {
      applicationId,
      isDeleted: false,
    },
    include: {
      departmentHead: {
        select: {
          id: true,
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      },
      application: {
        select: {
          id: true,
          status: true,
          scholarship: {
            select: {
              id: true,
              title: true,
              department: { select: { id: true, name: true } },
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
        },
      },
    },
  });

  if (!screening) {
    throw new AppError(
      status.NOT_FOUND,
      "No screening record found for this application",
    );
  }

  return screening;
};

export const ScreeningService = {
  screenApplication,
  getScreeningByApplicationId,
};
