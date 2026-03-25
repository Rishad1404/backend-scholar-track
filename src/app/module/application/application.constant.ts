
import { Prisma } from "../../../generated/prisma/client";

export const applicationSearchableFields = [
  "essay",
  "scholarship.title",
];

export const applicationFilterableFields = [
  "status",
  "universityId",
  "scholarshipId",
  "studentId",
];

export const applicationIncludeConfig: Partial<
  Record<
    keyof Prisma.ApplicationInclude,
    Prisma.ApplicationInclude[keyof Prisma.ApplicationInclude]
  >
> = {
  student: {
    select: {
      id: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      academicInfo: {
        include: {
          department: { select: { id: true, name: true } },
          level: { select: { id: true, name: true } },
          term: { select: { id: true, name: true } },
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
      deadline: true,
      status: true,
      departmentId: true,
      requiredDocTypes: true,
      university: { select: { id: true, name: true } },
      department: { select: { id: true, name: true } },
      level: { select: { id: true, name: true } },
    },
  },
  documents: {
    where: { isDeleted: false },
    select: {
      id: true,
      type: true,
      fileUrl: true,
      fileName: true,
      fileSize: true,
      uploadedAt: true,
    },
  },
  screening: {
    select: {
      id: true,
      passed: true,
      comment: true,
      reviewedAt: true,
      departmentHead: {
        select: {
          id: true,
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      },
    },
  },
  reviews: {
    where: { isDeleted: false },
    select: {
      id: true,
      gpaScore: true,
      essayScore: true,
      financialScore: true,
      criteriaScore: true,
      totalScore: true,
      notes: true,
      submittedAt: true,
      reviewer: {
        select: {
          id: true,
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      },
    },
  },
};