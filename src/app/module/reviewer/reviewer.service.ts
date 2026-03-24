
import { TAddReviewerPayload, TUpdateReviewerPayload } from "./reviewer.validation";
import AppError from "../../errorHelpers/AppError";
import status from "http-status";
import { sendEmail } from "../../utils/email";
import { envVars } from "../../../config/env";
import { prisma } from "../../lib/prisma";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../lib/auth";
import { IQueryParams } from "../../interfaces/query.interface";
import { QueryBuilder } from "../../utils/QueryBuilder";
import { Prisma, Reviewer } from "../../../generated/prisma/client";
import { reviewerFilterableFields, reviewerIncludeConfig, reviewerSearchableFields } from "./reviewer.constant";

const addReviewer = async (
  userId: string,
  role: string,
  payload: TAddReviewerPayload
) => {
  const { name, email, password, phone, designation, expertise } = payload;

  // 1. Find current admin
  const currentAdmin = await prisma.admin.findFirst({
    where: { userId, isDeleted: false },
  });

  if (!currentAdmin) {
    throw new AppError(status.NOT_FOUND, "Admin profile not found");
  }

  // 2. Only Owner Admin or Super Admin
  if (role !== Role.SUPER_ADMIN && !currentAdmin.isOwner) {
    throw new AppError(
      status.FORBIDDEN,
      "Only the owner admin can add reviewers"
    );
  }

  // 3. Check email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new AppError(status.CONFLICT, "Email already registered");
  }

  // 4. Create User via better-auth
  const data = await auth.api.signUpEmail({
    body: { name, email, password },
  });

  if (!data.user) {
    throw new AppError(
      status.INTERNAL_SERVER_ERROR,
      "Failed to create user"
    );
  }

  // 5. Transaction — set role + create profile
  const result = await prisma
    .$transaction(async (tx) => {
      await tx.user.update({
        where: { id: data.user.id },
        data: {
          role: Role.COMMITTEE_REVIEWER,
          needPasswordChange: true,
        },
      });

      const reviewer = await tx.reviewer.create({
        data: {
          userId: data.user.id,
          universityId: currentAdmin.universityId,
          phone,
          designation,
          expertise,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              status: true,
            },
          },
          university: {
            select: { id: true, name: true },
          },
        },
      });

      return reviewer;
    })
    .catch(async (err) => {
      await prisma.user
        .delete({ where: { id: data.user.id } })
        .catch(() => {});
      throw new AppError(
        status.INTERNAL_SERVER_ERROR,
        `Failed to create reviewer: ${err.message}`
      );
    });

  // 6. Send welcome email
  const adminUser = await prisma.user.findUnique({
    where: { id: userId },
  });

  sendEmail({
    to: email,
    subject: `You've been added as Committee Reviewer — ScholarTrack`,
    templateName: "reviewerAdded",
    templateData: {
      name,
      email,
      password,
      universityName: result.university.name,
      addedByName: adminUser?.name || "Admin",
      loginUrl: `${envVars.FRONTEND_URL}/login`,
    },
  }).catch((err) =>
    console.error("Reviewer welcome email failed:", err.message)
  );

  return result;
};


const getAllReviewers = async (
  userId: string,
  role: string,
  query: IQueryParams
) => {
  const queryBuilder = new QueryBuilder<
    Reviewer,
    Prisma.ReviewerWhereInput,
    Prisma.ReviewerInclude
  >(prisma.reviewer, query, {
    searchableFields: reviewerSearchableFields,
    filterableFields: reviewerFilterableFields,
  });

  if (role === Role.UNIVERSITY_ADMIN) {
    const currentAdmin = await prisma.admin.findFirst({
      where: { userId, isDeleted: false },
    });

    if (!currentAdmin) {
      throw new AppError(status.NOT_FOUND, "Admin profile not found");
    }

    queryBuilder.where({ universityId: currentAdmin.universityId });
  }

  const result = await queryBuilder
    .search()
    .filter()
    .where({ isDeleted: false })
    .include({
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          status: true,
        },
      },
      university: { select: { id: true, name: true } },
    })
    .dynamicInclude(reviewerIncludeConfig)
    .paginate()
    .sort()
    .fields()
    .execute();

  return result;
};


const getReviewerById = async (
  userId: string,
  role: string,
  reviewerId: string
) => {
  const reviewer = await prisma.reviewer.findFirst({
    where: { id: reviewerId, isDeleted: false },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          status: true,
        },
      },
      university: {
        select: { id: true, name: true },
      },
    },
  });

  if (!reviewer) {
    throw new AppError(status.NOT_FOUND, "Reviewer not found");
  }

  if (role !== Role.SUPER_ADMIN) {
    const currentAdmin = await prisma.admin.findFirst({
      where: { userId, isDeleted: false },
    });

    if (!currentAdmin) {
      throw new AppError(status.NOT_FOUND, "Admin profile not found");
    }

    if (reviewer.universityId !== currentAdmin.universityId) {
      throw new AppError(
        status.FORBIDDEN,
        "You don't have permission to view this reviewer"
      );
    }
  }

  return reviewer;
};

const updateReviewer = async (
  userId: string,
  role: string,
  reviewerId: string,
  payload: TUpdateReviewerPayload
) => {
  const reviewerData = payload.reviewer;

  if (!reviewerData) {
    throw new AppError(status.BAD_REQUEST, "No data provided to update");
  }

  const reviewer = await prisma.reviewer.findFirst({
    where: { id: reviewerId, isDeleted: false },
  });

  if (!reviewer) {
    throw new AppError(status.NOT_FOUND, "Reviewer not found");
  }

  // Permission check
  if (role !== Role.SUPER_ADMIN) {
    const isSelf = reviewer.userId === userId;

    if (role === Role.COMMITTEE_REVIEWER) {
      // Reviewer can only update themselves
      if (!isSelf) {
        throw new AppError(
          status.FORBIDDEN,
          "You can only update your own profile"
        );
      }
    } else if (role === Role.UNIVERSITY_ADMIN) {
      const currentAdmin = await prisma.admin.findFirst({
        where: { userId, isDeleted: false },
      });

      if (!currentAdmin) {
        throw new AppError(status.NOT_FOUND, "Admin profile not found");
      }

      if (!currentAdmin.isOwner && !isSelf) {
        throw new AppError(
          status.FORBIDDEN,
          "Only the owner admin can update other reviewers"
        );
      }

      if (reviewer.universityId !== currentAdmin.universityId) {
        throw new AppError(
          status.FORBIDDEN,
          "You can only update reviewers from your university"
        );
      }
    }
  }

  // Separate User fields and Reviewer fields
  const { name, ...reviewerFields } = reviewerData;

  const result = await prisma.$transaction(async (tx) => {
    const updatedReviewer = await tx.reviewer.update({
      where: { id: reviewerId },
      data: {
        ...reviewerFields,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            status: true,
          },
        },
        university: {
          select: { id: true, name: true },
        },
      },
    });

    if (name) {
      await tx.user.update({
        where: { id: reviewer.userId },
        data: { name },
      });
    }

    return updatedReviewer;
  });

  return result;
};

const deleteReviewer = async (
  userId: string,
  role: string,
  reviewerId: string
) => {
  const reviewer = await prisma.reviewer.findFirst({
    where: { id: reviewerId, isDeleted: false },
  });

  if (!reviewer) {
    throw new AppError(status.NOT_FOUND, "Reviewer not found");
  }

  // Permission check
  if (role !== Role.SUPER_ADMIN) {
    const currentAdmin = await prisma.admin.findFirst({
      where: { userId, isDeleted: false },
    });

    if (!currentAdmin) {
      throw new AppError(status.NOT_FOUND, "Admin profile not found");
    }

    if (!currentAdmin.isOwner) {
      throw new AppError(
        status.FORBIDDEN,
        "Only the owner admin can remove reviewers"
      );
    }

    if (reviewer.universityId !== currentAdmin.universityId) {
      throw new AppError(
        status.FORBIDDEN,
        "You can only remove reviewers from your university"
      );
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.reviewer.update({
      where: { id: reviewerId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    await tx.user.update({
      where: { id: reviewer.userId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        status: "DELETED",
      },
    });

    await tx.session.deleteMany({
      where: { userId: reviewer.userId },
    });

    return await tx.reviewer.findUnique({
      where: { id: reviewerId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
            isDeleted: true,
          },
        },
        university: {
          select: { id: true, name: true },
        },
      },
    });
  });

  return result;
};

export const ReviewerService = {
  addReviewer,
  getAllReviewers,
  getReviewerById,
  updateReviewer,
  deleteReviewer,
};