
import { Prisma } from "../../../generated/prisma/client";

export const disbursementSearchableFields: string[] = [];

export const disbursementFilterableFields = [
  "status",
  "universityId",
  "scholarshipId",
  "studentId",
];

export const disbursementIncludeConfig: Partial<
  Record<
    keyof Prisma.DisbursementInclude,
    Prisma.DisbursementInclude[keyof Prisma.DisbursementInclude]
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
    },
  },
  scholarship: {
    select: {
      id: true,
      title: true,
      amountPerStudent: true,
      department: { select: { id: true, name: true } },
    },
  },
  application: {
    select: {
      id: true,
      status: true,
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
    select: {
      id: true,
      name: true,
    },
  },
};