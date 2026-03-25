/* eslint-disable @typescript-eslint/no-explicit-any */
import status from "http-status";
import {
  ApplicationStatus,
  DisbursementStatus,
  NotificationType,
  Prisma,
  Role,
} from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import AppError from "../../errorHelpers/AppError";
import { IQueryParams } from "../../interfaces/query.interface";
import { QueryBuilder } from "../../utils/QueryBuilder";
import {
  disbursementFilterableFields,
  disbursementIncludeConfig,
} from "./disbursement.constant";
import { PLATFORM_FEE_PERCENTAGE, stripe } from "../../../config/stripe.config";

// ═══════════════════════════════════════════
// Helper: Get admin
// ═══════════════════════════════════════════
const getAdmin = async (userId: string) => {
  const admin = await prisma.admin.findFirst({
    where: { userId, isDeleted: false },
  });

  if (!admin) {
    throw new AppError(status.NOT_FOUND, "Admin profile not found");
  }

  return admin;
};

// ═══════════════════════════════════════════
// CREATE DISBURSEMENT
// ═══════════════════════════════════════════
const createDisbursement = async (
  userId: string,
  payload: { applicationId: string }
) => {
  const admin = await getAdmin(userId);

  // ── Find the approved application ──
  const application = await prisma.application.findFirst({
    where: {
      id: payload.applicationId,
      isDeleted: false,
    },
    include: {
      scholarship: {
        select: {
          id: true,
          title: true,
          amountPerStudent: true,
          universityId: true,
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

  // ── Status check ──
  if (application.status !== ApplicationStatus.APPROVED) {
    throw new AppError(
      status.BAD_REQUEST,
      `Cannot create disbursement for application with status "${application.status}". Only APPROVED applications can be disbursed.`
    );
  }

  // ── University match ──
  if (application.scholarship.universityId !== admin.universityId) {
    throw new AppError(
      status.FORBIDDEN,
      "You can only create disbursements for your own university"
    );
  }

  // ── Check duplicate disbursement ──
  const existingDisbursement = await prisma.disbursement.findFirst({
    where: { applicationId: payload.applicationId },
  });

  if (existingDisbursement) {
    throw new AppError(
      status.CONFLICT,
      `Disbursement already exists for this application (Status: ${existingDisbursement.status})`
    );
  }

  // ── Calculate amounts ──
  const amount = application.scholarship.amountPerStudent;
  const platformFee = (amount * PLATFORM_FEE_PERCENTAGE) / 100;

  // ── Create disbursement record ──
  const disbursement = await prisma.disbursement.create({
    data: {
      applicationId: application.id,
      studentId: application.student.id,
      approvedById: admin.id,
      universityId: admin.universityId,
      scholarshipId: application.scholarship.id,
      amount,
      currency: "BDT",
      status: DisbursementStatus.PENDING,
      platformFee,
      metadata: {
        scholarshipTitle: application.scholarship.title,
        studentName: application.student.user.name,
        studentEmail: application.student.user.email,
        approvedBy: userId,
      },
    },
    include: {
      student: {
        select: {
          id: true,
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      },
      scholarship: {
        select: {
          id: true,
          title: true,
          amountPerStudent: true,
        },
      },
      approvedBy: {
        select: {
          id: true,
          user: {
            select: { id: true, name: true },
          },
        },
      },
    },
  });

  // ── Notify student ──
  await prisma.notification.create({
    data: {
      userId: application.student.user.id,
      type: NotificationType.DISBURSEMENT_PROCESSED,
      title: "Disbursement Initiated",
      message: `A disbursement of ${amount} BDT for "${application.scholarship.title}" has been initiated. You will be notified once it is processed.`,
      link: `/applications/${application.id}`,
    },
  });

  return disbursement;
};

// ═══════════════════════════════════════════
// PROCESS DISBURSEMENT (Change Status)
// ═══════════════════════════════════════════
const processDisbursement = async (
  userId: string,
  disbursementId: string,
  payload: {
    action: "PROCESS" | "COMPLETE" | "FAIL";
    remarks?: string;
  }
) => {
  const admin = await getAdmin(userId);

  const disbursement = await prisma.disbursement.findFirst({
    where: { id: disbursementId },
    include: {
      application: { select: { id: true } },
      student: {
        select: {
          id: true,
          userId: true,
          user: {
            select: { id: true, name: true },
          },
        },
      },
      scholarship: {
        select: { id: true, title: true },
      },
    },
  });

  if (!disbursement) {
    throw new AppError(status.NOT_FOUND, "Disbursement not found");
  }

  if (disbursement.universityId !== admin.universityId) {
    throw new AppError(
      status.FORBIDDEN,
      "You can only process disbursements for your own university"
    );
  }

  // ── Valid transitions ──
  const validTransitions: Record<DisbursementStatus, string[]> = {
    [DisbursementStatus.PENDING]: ["PROCESS"],
    [DisbursementStatus.PROCESSING]: ["COMPLETE", "FAIL"],
    [DisbursementStatus.COMPLETED]: [],
    [DisbursementStatus.FAILED]: ["PROCESS"], // Allow retry
  };

  const allowed = validTransitions[disbursement.status];

  if (!allowed.includes(payload.action)) {
    throw new AppError(
      status.BAD_REQUEST,
      `Cannot "${payload.action}" disbursement with status "${disbursement.status}". Allowed actions: ${
        allowed.length > 0 ? allowed.join(", ") : "none"
      }`
    );
  }

  // ── Map action to status ──
  const statusMap: Record<string, DisbursementStatus> = {
    PROCESS: DisbursementStatus.PROCESSING,
    COMPLETE: DisbursementStatus.COMPLETED,
    FAIL: DisbursementStatus.FAILED,
  };

  const newStatus = statusMap[payload.action];
  const isCompleted = newStatus === DisbursementStatus.COMPLETED;

  // ── Update disbursement ──
  const updatedDisbursement = await prisma.disbursement.update({
    where: { id: disbursementId },
    data: {
      status: newStatus,
      ...(isCompleted && { disbursedAt: new Date() }),
      ...(payload.remarks && {
        metadata: {
          ...(disbursement.metadata as Record<string, unknown>),
          processingRemarks: payload.remarks,
          processedAt: new Date().toISOString(),
        },
      }),
    },
    include: {
      student: {
        select: {
          id: true,
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      },
      scholarship: {
        select: { id: true, title: true, amountPerStudent: true },
      },
      approvedBy: {
        select: {
          id: true,
          user: { select: { id: true, name: true } },
        },
      },
    },
  });

  // ── If completed, update application status to DISBURSED ──
  if (isCompleted) {
    await prisma.application.update({
      where: { id: disbursement.application.id },
      data: { status: ApplicationStatus.DISBURSED },
    });

    // Notify student
    await prisma.notification.create({
      data: {
        userId: disbursement.student.user.id,
        type: NotificationType.DISBURSEMENT_PROCESSED,
        title: "💰 Disbursement Completed!",
        message: `Your scholarship disbursement of ${disbursement.amount} BDT for "${disbursement.scholarship.title}" has been completed successfully.`,
        link: `/applications/${disbursement.application.id}`,
      },
    });
  }

  // ── If failed, notify student ──
  if (newStatus === DisbursementStatus.FAILED) {
    await prisma.notification.create({
      data: {
        userId: disbursement.student.user.id,
        type: NotificationType.DISBURSEMENT_PROCESSED,
        title: "Disbursement Issue",
        message: `There was an issue processing your disbursement for "${disbursement.scholarship.title}". The admin team is looking into it.${
          payload.remarks ? ` Note: ${payload.remarks}` : ""
        }`,
        link: `/applications/${disbursement.application.id}`,
      },
    });
  }

  return updatedDisbursement;
};

// ═══════════════════════════════════════════
// PROCESS VIA STRIPE (Optional)
// ═══════════════════════════════════════════
const processViaStripe = async (
  userId: string,
  disbursementId: string,
  stripeAccountId: string // Student's Stripe Connected Account
) => {
  const admin = await getAdmin(userId);

  const disbursement = await prisma.disbursement.findFirst({
    where: { id: disbursementId },
  });

  if (!disbursement) {
    throw new AppError(status.NOT_FOUND, "Disbursement not found");
  }

  if (disbursement.universityId !== admin.universityId) {
    throw new AppError(status.FORBIDDEN, "Access denied");
  }

  if (disbursement.status !== DisbursementStatus.PENDING) {
    throw new AppError(
      status.BAD_REQUEST,
      "Disbursement must be in PENDING status to process via Stripe"
    );
  }

  try {
    // Create Stripe Transfer
    const transfer = await stripe.transfers.create({
      amount: Math.round(disbursement.amount * 100), 
      currency: disbursement.currency.toLowerCase(),
      destination: stripeAccountId,
      metadata: {
        disbursementId: disbursement.id,
        universityId: disbursement.universityId,
        studentId: disbursement.studentId,
      },
    });

    // Update disbursement
    await prisma.disbursement.update({
      where: { id: disbursementId },
      data: {
        status: DisbursementStatus.PROCESSING,
        stripeTransferId: transfer.id,
      },
    });

    return { transferId: transfer.id, status: "PROCESSING" };
  } catch (error: any) {
    await prisma.disbursement.update({
      where: { id: disbursementId },
      data: {
        status: DisbursementStatus.FAILED,
        metadata: {
          ...(disbursement.metadata as Record<string, unknown>),
          stripeError: error.message,
        },
      },
    });

    throw new AppError(
      status.INTERNAL_SERVER_ERROR,
      `Stripe transfer failed: ${error.message}`
    );
  }
};

// ═══════════════════════════════════════════
// GET ALL DISBURSEMENTS (Role-filtered)
// ═══════════════════════════════════════════
const getAllDisbursements = async (
  userId: string,
  role: string,
  query: IQueryParams
) => {
  const queryBuilder = new QueryBuilder<
    any,
    Prisma.DisbursementWhereInput,
    Prisma.DisbursementInclude
  >(prisma.disbursement, query, {
    searchableFields: [],
    filterableFields: disbursementFilterableFields,
  });

  if (role === Role.UNIVERSITY_ADMIN) {
    const admin = await getAdmin(userId);
    queryBuilder.where({ universityId: admin.universityId });
  }

  if (role === Role.STUDENT) {
    const student = await prisma.student.findFirst({
      where: { userId, isDeleted: false },
    });

    if (!student) {
      throw new AppError(
        status.NOT_FOUND,
        "Student profile not found"
      );
    }

    queryBuilder.where({ studentId: student.id });
  }

  const result = await queryBuilder
    .search()
    .filter()
    .include({
      student: {
        select: {
          id: true,
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      },
      scholarship: {
        select: {
          id: true,
          title: true,
          amountPerStudent: true,
        },
      },
      approvedBy: {
        select: {
          id: true,
          user: {
            select: { id: true, name: true },
          },
        },
      },
      university: {
        select: { id: true, name: true },
      },
    })
    .dynamicInclude(disbursementIncludeConfig)
    .paginate()
    .sort()
    .fields()
    .execute();

  return result;
};

// ═══════════════════════════════════════════
// GET SINGLE DISBURSEMENT
// ═══════════════════════════════════════════
const getDisbursementById = async (
  userId: string,
  role: string,
  disbursementId: string
) => {
  const disbursement = await prisma.disbursement.findFirst({
    where: { id: disbursementId },
    include: {
      student: {
        select: {
          id: true,
          userId: true,
          user: {
            select: { id: true, name: true, email: true, image: true },
          },
          academicInfo: {
            include: {
              department: { select: { id: true, name: true } },
              level: { select: { id: true, name: true } },
            },
          },
        },
      },
      scholarship: {
        select: {
          id: true,
          title: true,
          totalAmount: true,
          amountPerStudent: true,
          quota: true,
          department: { select: { id: true, name: true } },
        },
      },
      application: {
        select: {
          id: true,
          status: true,
          submittedAt: true,
        },
      },
      approvedBy: {
        select: {
          id: true,
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      },
      university: {
        select: { id: true, name: true },
      },
    },
  });

  if (!disbursement) {
    throw new AppError(status.NOT_FOUND, "Disbursement not found");
  }

  // ── Role-based access ──
  if (role === Role.STUDENT) {
    if (disbursement.student.userId !== userId) {
      throw new AppError(
        status.FORBIDDEN,
        "You can only view your own disbursements"
      );
    }
  }

  if (role === Role.UNIVERSITY_ADMIN) {
    const admin = await getAdmin(userId);
    if (disbursement.universityId !== admin.universityId) {
      throw new AppError(status.FORBIDDEN, "Access denied");
    }
  }

  return disbursement;
};

export const DisbursementService = {
  createDisbursement,
  processDisbursement,
  processViaStripe,
  getAllDisbursements,
  getDisbursementById,
};