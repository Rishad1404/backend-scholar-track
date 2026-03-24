
import { Prisma } from "../../../generated/prisma/client";


export const scholarshipSearchableFields = [
  "title",
  "description",
];


export const scholarshipFilterableFields = [
  "universityId",
  "departmentId",
  "levelId",
  "status",
  "financialNeedRequired",
];


export const scholarshipIncludeConfig: Partial<
  Record<
    keyof Prisma.ScholarshipInclude,
    Prisma.ScholarshipInclude[keyof Prisma.ScholarshipInclude]
  >
> = {
  university: {
    select: {
      id: true,
      name: true,
      logoUrl: true,
    },
  },
  department: {
    select: {
      id: true,
      name: true,
    },
  },
  level: {
    select: {
      id: true,
      name: true,
    },
  },
  applications: {
    where: { isDeleted: false },
    select: {
      id: true,
      status: true,
      studentId: true,
    },
  },
};